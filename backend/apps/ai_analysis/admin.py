from django.contrib import admin
from .models import AIAnalysis, HintRequest, SkillSnapshot


@admin.register(AIAnalysis)
class AIAnalysisAdmin(admin.ModelAdmin):
    list_display = ("submission", "created_at", "updated_at")
    readonly_fields = ("bugs", "code_smells", "security_flags")


@admin.register(HintRequest)
class HintRequestAdmin(admin.ModelAdmin):
    list_display = ("student", "submission", "level", "created_at")
    list_filter = ("level",)


@admin.register(SkillSnapshot)
class SkillSnapshotAdmin(admin.ModelAdmin):
    list_display = ("student", "readability", "efficiency", "security", "created_at")
