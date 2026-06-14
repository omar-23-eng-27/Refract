from rest_framework import serializers
from .models import AIAnalysis, HintRequest, SkillSnapshot


class AIAnalysisSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIAnalysis
        fields = ("id", "submission", "bugs", "code_smells", "security_flags", "created_at", "updated_at")
        read_only_fields = fields


class HintRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = HintRequest
        fields = ("id", "student", "submission", "level", "hint_text", "created_at")
        read_only_fields = ("id", "student", "hint_text", "created_at")

    def create(self, validated_data):
        validated_data["student"] = self.context["request"].user
        return super().create(validated_data)


class SkillSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = SkillSnapshot
        fields = ("id", "student", "readability", "efficiency", "security", "created_at", "notes")
        read_only_fields = ("id", "student", "created_at")
