from django.urls import path
from .views import AIAnalysisView, HintRequestView, SkillSnapshotListView, InstructorStatsView

urlpatterns = [
    path("submissions/<int:submission_id>/analysis/", AIAnalysisView.as_view(), name="ai-analysis"),
    path("submissions/<int:submission_id>/hints/", HintRequestView.as_view(), name="hints"),
    path("users/<int:user_id>/snapshots/", SkillSnapshotListView.as_view(), name="snapshots"),
    path("instructor/stats/", InstructorStatsView.as_view(), name="instructor-stats"),
]
