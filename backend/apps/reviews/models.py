from django.db import models
from django.conf import settings


class Review(models.Model):
    submission = models.ForeignKey(
        "assignments.Submission",
        on_delete=models.CASCADE,
        related_name="reviews",
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reviews_given",
    )
    overall_comment = models.TextField(blank=True)
    ai_quality_score = models.FloatField(null=True, blank=True)
    coverage_score = models.FloatField(null=True, blank=True)
    accuracy_score = models.FloatField(null=True, blank=True)
    constructiveness_score = models.FloatField(null=True, blank=True)
    bug_detection_score = models.FloatField(null=True, blank=True)
    missed_bugs = models.JSONField(default=list)
    strengths = models.JSONField(default=list)
    areas_for_improvement = models.JSONField(default=list)
    feedback_summary = models.TextField(blank=True)
    is_complete = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "reviews"
        ordering = ["-created_at"]
        unique_together = ("submission", "reviewer")

    def __str__(self):
        return f"Review of {self.submission} by {self.reviewer.username}"


class LineComment(models.Model):
    review = models.ForeignKey(
        Review, on_delete=models.CASCADE, related_name="line_comments"
    )
    file_path = models.CharField(max_length=500, default="main")
    # Stored as character offsets, not line numbers — resilient to edits
    start_offset = models.PositiveIntegerField()
    end_offset = models.PositiveIntegerField()
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "line_comments"
        ordering = ["start_offset"]

    def __str__(self):
        return f"Comment [{self.start_offset}:{self.end_offset}] on {self.review}"
