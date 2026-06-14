from django.urls import path
from .views import (
    AssignmentListCreateView,
    AssignmentDetailView,
    SubmissionListCreateView,
    SubmissionDetailView,
    RunCodeView,
    InstructorSubmissionsView,
)

urlpatterns = [
    path("", AssignmentListCreateView.as_view(), name="assignment-list"),
    path("<int:pk>/", AssignmentDetailView.as_view(), name="assignment-detail"),
    path("<int:assignment_id>/submissions/", SubmissionListCreateView.as_view(), name="submission-list"),
    path("submissions/<int:pk>/", SubmissionDetailView.as_view(), name="submission-detail"),
    path("submissions/<int:pk>/run/", RunCodeView.as_view(), name="submission-run"),
    path("instructor/submissions/", InstructorSubmissionsView.as_view(), name="instructor-submissions"),
]
