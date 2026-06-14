from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from .models import AIAnalysis, HintRequest, SkillSnapshot
from .serializers import AIAnalysisSerializer, HintRequestSerializer, SkillSnapshotSerializer
from apps.assignments.models import Submission
from django.contrib.auth import get_user_model

User = get_user_model()


class AIAnalysisView(APIView):
    def get(self, request, submission_id):
        submission = get_object_or_404(Submission, pk=submission_id)
        if submission.student != request.user and not request.user.is_instructor:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied()
        analysis = get_object_or_404(AIAnalysis, submission=submission)
        return Response(AIAnalysisSerializer(analysis).data)


class HintRequestView(APIView):
    def post(self, request, submission_id):
        submission = get_object_or_404(Submission, pk=submission_id, student=request.user)
        level = request.data.get("level", 1)

        existing = HintRequest.objects.filter(student=request.user, submission=submission, level=level).first()
        if existing:
            return Response(HintRequestSerializer(existing).data)

        from .tasks import generate_hint
        task = generate_hint.delay(submission_id, request.user.id, level)
        return Response({"status": "queued", "task_id": task.id}, status=status.HTTP_202_ACCEPTED)

    def get(self, request, submission_id):
        hints = HintRequest.objects.filter(student=request.user, submission_id=submission_id)
        return Response(HintRequestSerializer(hints, many=True).data)


class SkillSnapshotListView(generics.ListAPIView):
    serializer_class = SkillSnapshotSerializer

    def get_queryset(self):
        user_id = self.kwargs.get("user_id", self.request.user.id)
        if str(user_id) != str(self.request.user.id) and not self.request.user.is_instructor:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied()
        return SkillSnapshot.objects.filter(student_id=user_id).order_by("created_at")


class InstructorStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.user.is_instructor:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied()

        from apps.assignments.models import Assignment, Submission
        from apps.reviews.models import Review

        assignments = Assignment.objects.filter(created_by=request.user)
        total_submissions = Submission.objects.filter(assignment__in=assignments).count()
        total_reviews = Review.objects.filter(submission__assignment__in=assignments, is_complete=True).count()

        students = User.objects.filter(role="student", submissions__assignment__in=assignments).distinct()
        student_data = []
        for s in students[:50]:
            student_data.append({
                "id": s.id,
                "username": s.username,
                "readability": s.readability_score,
                "efficiency": s.efficiency_score,
                "security": s.security_score,
                "submission_count": s.submissions.filter(assignment__in=assignments).count(),
            })

        return Response({
            "assignment_count": assignments.count(),
            "total_submissions": total_submissions,
            "total_reviews": total_reviews,
            "students": student_data,
        })
