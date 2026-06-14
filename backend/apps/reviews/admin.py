from django.contrib import admin
from .models import Review, LineComment


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("reviewer", "submission", "ai_quality_score", "is_complete", "created_at")
    list_filter = ("is_complete",)


@admin.register(LineComment)
class LineCommentAdmin(admin.ModelAdmin):
    list_display = ("review", "file_path", "start_offset", "end_offset", "created_at")
