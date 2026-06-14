from django.db import models
from django.conf import settings


class AIAnalysis(models.Model):
    submission = models.OneToOneField(
        "assignments.Submission",
        on_delete=models.CASCADE,
        related_name="ai_analysis",
    )
    bugs = models.JSONField(default=list)
    code_smells = models.JSONField(default=list)
    security_flags = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "ai_analyses"
        verbose_name = "AI Analysis"
        verbose_name_plural = "AI Analyses"

    def __str__(self):
        return f"Analysis of {self.submission}"


class HintRequest(models.Model):
    NUDGE = 1
    CONCEPT = 2
    NEAR_SOLUTION = 3
    LEVEL_CHOICES = [
        (NUDGE, "Nudge"),
        (CONCEPT, "Concept"),
        (NEAR_SOLUTION, "Near-Solution"),
    ]

    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="hint_requests",
    )
    submission = models.ForeignKey(
        "assignments.Submission",
        on_delete=models.CASCADE,
        related_name="hint_requests",
    )
    level = models.IntegerField(choices=LEVEL_CHOICES, default=NUDGE)
    hint_text = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "hint_requests"
        unique_together = ("student", "submission", "level")
        ordering = ["level"]

    def __str__(self):
        return f"Hint L{self.level} for {self.student.username} on {self.submission}"


class SkillSnapshot(models.Model):
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="skill_snapshots",
    )
    readability = models.FloatField()
    efficiency = models.FloatField()
    security = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)
    notes = models.CharField(max_length=200, blank=True)

    class Meta:
        db_table = "skill_snapshots"
        ordering = ["created_at"]

    def __str__(self):
        return f"Snapshot for {self.student.username} at {self.created_at:%Y-%m-%d}"
