from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from .models import Review, LineComment
from .serializers import ReviewSerializer, ReviewListSerializer, LineCommentSerializer
from apps.assignments.models import Submission


class ReviewListCreateView(generics.ListCreateAPIView):
    def get_serializer_class(self):
        if self.request.method == "GET":
            return ReviewListSerializer
        return ReviewSerializer

    def get_queryset(self):
        submission_id = self.kwargs.get("submission_id")
        return Review.objects.filter(submission_id=submission_id).select_related("reviewer")

    def perform_create(self, serializer):
        submission = get_object_or_404(Submission, pk=self.kwargs["submission_id"])
        if submission.student == self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You cannot review your own submission.")
        serializer.save(submission=submission, reviewer=self.request.user)


class ReviewDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = ReviewSerializer

    def get_queryset(self):
        return Review.objects.select_related("reviewer", "submission").prefetch_related("line_comments")

    def update(self, request, *args, **kwargs):
        review = self.get_object()
        if review.reviewer != request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only edit your own review.")
        return super().update(request, *args, **kwargs)


class CompleteReviewView(APIView):
    def post(self, request, pk):
        review = get_object_or_404(Review, pk=pk, reviewer=request.user)
        review.is_complete = True
        review.save()
        from apps.ai_analysis.tasks import score_peer_review
        score_peer_review.delay(review.id)
        return Response({"status": "scoring_queued", "review_id": review.id})


class LineCommentListCreateView(generics.ListCreateAPIView):
    serializer_class = LineCommentSerializer

    def get_queryset(self):
        review_id = self.kwargs["review_id"]
        return LineComment.objects.filter(review_id=review_id)

    def perform_create(self, serializer):
        review = get_object_or_404(Review, pk=self.kwargs["review_id"], reviewer=self.request.user)
        serializer.save(review=review)


class ArbitrationResultView(APIView):
    def get(self, request, submission_id):
        submission = get_object_or_404(Submission, pk=submission_id)
        if submission.student != request.user and not request.user.is_instructor:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied()

        reviews = Review.objects.filter(
            submission=submission, is_complete=True
        ).prefetch_related("line_comments")

        try:
            ai_analysis = submission.ai_analysis
            from apps.ai_analysis.serializers import AIAnalysisSerializer
            ai_data = AIAnalysisSerializer(ai_analysis).data
        except Exception:
            ai_data = None

        from apps.assignments.serializers import SubmissionSerializer
        return Response(
            {
                "submission": SubmissionSerializer(submission, context={"request": request}).data,
                "reviews": ReviewSerializer(reviews, many=True, context={"request": request}).data,
                "ai_analysis": ai_data,
            }
        )
