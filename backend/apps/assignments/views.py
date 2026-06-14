from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from .models import Assignment, Submission
from .serializers import AssignmentSerializer, AssignmentListSerializer, SubmissionSerializer


class IsInstructor(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_instructor


class AssignmentListCreateView(generics.ListCreateAPIView):
    def get_serializer_class(self):
        if self.request.method == "GET":
            return AssignmentListSerializer
        return AssignmentSerializer

    def get_queryset(self):
        return Assignment.objects.filter(is_active=True).select_related("created_by")

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsInstructor()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class AssignmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Assignment.objects.all()
    serializer_class = AssignmentSerializer

    def get_permissions(self):
        if self.request.method in ("PUT", "PATCH", "DELETE"):
            return [IsInstructor()]
        return [permissions.IsAuthenticated()]


class SubmissionListCreateView(generics.ListCreateAPIView):
    serializer_class = SubmissionSerializer

    def get_queryset(self):
        assignment_id = self.kwargs.get("assignment_id")
        if self.request.user.is_instructor:
            return Submission.objects.filter(assignment_id=assignment_id).select_related("student", "assignment")
        return Submission.objects.filter(
            assignment_id=assignment_id, student=self.request.user
        ).select_related("assignment")

    def perform_create(self, serializer):
        assignment = get_object_or_404(Assignment, pk=self.kwargs["assignment_id"])
        serializer.save(assignment=assignment)


class SubmissionDetailView(generics.RetrieveAPIView):
    serializer_class = SubmissionSerializer

    def get_queryset(self):
        if self.request.user.is_instructor:
            return Submission.objects.all()
        return Submission.objects.filter(student=self.request.user)


class RunCodeView(APIView):
    def post(self, request, pk):
        submission = get_object_or_404(Submission, pk=pk, student=request.user)
        from apps.ai_analysis.tasks import execute_code_in_sandbox, analyze_submission_bugs
        execute_code_in_sandbox.delay(submission.id)
        return Response({"status": "queued", "submission_id": submission.id})


class InstructorSubmissionsView(generics.ListAPIView):
    serializer_class = SubmissionSerializer
    permission_classes = [IsInstructor]

    def get_queryset(self):
        return (
            Submission.objects.select_related("student", "assignment")
            .filter(assignment__created_by=self.request.user)
            .order_by("-submitted_at")
        )
