from rest_framework import serializers
from .models import Review, LineComment


class LineCommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = LineComment
        fields = ("id", "review", "file_path", "start_offset", "end_offset", "content", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")


class ReviewSerializer(serializers.ModelSerializer):
    reviewer_username = serializers.CharField(source="reviewer.username", read_only=True)
    line_comments = LineCommentSerializer(many=True, read_only=True)

    class Meta:
        model = Review
        fields = (
            "id",
            "submission",
            "reviewer",
            "reviewer_username",
            "overall_comment",
            "ai_quality_score",
            "coverage_score",
            "accuracy_score",
            "constructiveness_score",
            "bug_detection_score",
            "missed_bugs",
            "strengths",
            "areas_for_improvement",
            "feedback_summary",
            "is_complete",
            "line_comments",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "reviewer",
            "ai_quality_score",
            "coverage_score",
            "accuracy_score",
            "constructiveness_score",
            "bug_detection_score",
            "missed_bugs",
            "strengths",
            "areas_for_improvement",
            "feedback_summary",
            "created_at",
            "updated_at",
        )

    def create(self, validated_data):
        validated_data["reviewer"] = self.context["request"].user
        return super().create(validated_data)


class ReviewListSerializer(serializers.ModelSerializer):
    reviewer_username = serializers.CharField(source="reviewer.username", read_only=True)
    comment_count = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = (
            "id",
            "submission",
            "reviewer_username",
            "ai_quality_score",
            "is_complete",
            "comment_count",
            "created_at",
        )

    def get_comment_count(self, obj):
        return obj.line_comments.count()
