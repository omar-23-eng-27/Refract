from django.db import models
from django.conf import settings


class Assignment(models.Model):
    PYTHON = "python"
    JAVASCRIPT = "javascript"
    JAVA = "java"
    CPP = "cpp"
    C = "c"
    TYPESCRIPT = "typescript"
    LANGUAGE_CHOICES = [
        (PYTHON, "Python"),
        (JAVASCRIPT, "JavaScript"),
        (JAVA, "Java"),
        (CPP, "C++"),
        (C, "C"),
        (TYPESCRIPT, "TypeScript"),
    ]

    title = models.CharField(max_length=200)
    language = models.CharField(max_length=20, choices=LANGUAGE_CHOICES, default=PYTHON)
    problem_statement = models.TextField()
    starter_code = models.TextField(blank=True)
    test_suite = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="assignments",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    due_date = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    review_deadline = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "assignments"
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class Submission(models.Model):
    PENDING = "pending"
    RUNNING = "running"
    PASSED = "passed"
    FAILED = "failed"
    ERROR = "error"
    STATUS_CHOICES = [
        (PENDING, "Pending"),
        (RUNNING, "Running"),
        (PASSED, "Passed"),
        (FAILED, "Failed"),
        (ERROR, "Error"),
    ]

    assignment = models.ForeignKey(
        Assignment, on_delete=models.CASCADE, related_name="submissions"
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="submissions",
    )
    code = models.TextField()
    version = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=PENDING)
    execution_result = models.JSONField(null=True, blank=True)
    ai_analysis_result = models.JSONField(null=True, blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "submissions"
        ordering = ["-submitted_at"]
        unique_together = ("assignment", "student", "version")

    def __str__(self):
        return f"{self.student.username} — {self.assignment.title} v{self.version}"
