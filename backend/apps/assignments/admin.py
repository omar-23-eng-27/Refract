from django.contrib import admin
from .models import Assignment, Submission


@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display = ("title", "language", "created_by", "created_at", "is_active")
    list_filter = ("language", "is_active")
    search_fields = ("title",)


@admin.register(Submission)
class SubmissionAdmin(admin.ModelAdmin):
    list_display = ("student", "assignment", "version", "status", "submitted_at")
    list_filter = ("status", "assignment__language")
    search_fields = ("student__username", "assignment__title")
