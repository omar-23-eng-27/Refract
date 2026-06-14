from django.urls import path
from .views import (
    ReviewListCreateView,
    ReviewDetailView,
    CompleteReviewView,
    LineCommentListCreateView,
    ArbitrationResultView,
)

urlpatterns = [
    path("submissions/<int:submission_id>/reviews/", ReviewListCreateView.as_view(), name="review-list"),
    path("<int:pk>/", ReviewDetailView.as_view(), name="review-detail"),
    path("<int:pk>/complete/", CompleteReviewView.as_view(), name="review-complete"),
    path("<int:review_id>/comments/", LineCommentListCreateView.as_view(), name="line-comment-list"),
    path("submissions/<int:submission_id>/arbitration/", ArbitrationResultView.as_view(), name="arbitration"),
]
