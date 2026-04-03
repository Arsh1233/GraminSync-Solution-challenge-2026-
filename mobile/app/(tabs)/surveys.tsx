// Surveys list screen - shows all captured surveys with sync status
import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { database } from "../../lib/database";
import { Survey } from "../../models";
import { Q } from "@nozbe/watermelondb";

const SYNC_STATUS_CONFIG: Record<
  string,
  { icon: string; color: string; label: string }
> = {
  pending: { icon: "⏳", color: "#FF9800", label: "Pending Sync" },
  syncing: { icon: "🔄", color: "#2196F3", label: "Syncing..." },
  synced: { icon: "✅", color: "#4CAF50", label: "Synced" },
  error: { icon: "❌", color: "#F44336", label: "Sync Error" },
};

export default function SurveysScreen() {
  const router = useRouter();
  const [surveys, setSurveys] = useState<Survey[]>([]);

  const loadSurveys = useCallback(async () => {
    try {
      const results = await database
        .get<Survey>("surveys")
        .query(Q.sortBy("created_at", Q.desc))
        .fetch();
      setSurveys(results);
    } catch (error) {
      console.error("Failed to load surveys:", error);
    }
  }, []);

  useEffect(() => {
    loadSurveys();
    // Subscribe to WatermelonDB changes for reactive updates
    const subscription = database
      .get<Survey>("surveys")
      .query()
      .observe()
      .subscribe((updatedSurveys) => {
        setSurveys(updatedSurveys);
      });
    return () => subscription.unsubscribe();
  }, [loadSurveys]);

  const renderSurveyItem = ({ item }: { item: Survey }) => {
    const statusConfig =
      SYNC_STATUS_CONFIG[item.syncStatus] ?? SYNC_STATUS_CONFIG.pending;

    return (
      <TouchableOpacity style={styles.surveyCard}>
        <View style={styles.surveyHeader}>
          <Text style={styles.surveyTitle}>{item.title}</Text>
          <View
            style={[styles.statusBadge, { backgroundColor: statusConfig.color }]}
          >
            <Text style={styles.statusText}>
              {statusConfig.icon} {statusConfig.label}
            </Text>
          </View>
        </View>
        <Text style={styles.surveyMeta}>
          📍 {item.locationLat?.toFixed(4)}, {item.locationLng?.toFixed(4)}
        </Text>
        <Text style={styles.surveyMeta}>
          🕐 {new Date(item.createdAt).toLocaleDateString()}
        </Text>
        {item.extractedText && (
          <Text style={styles.extractedText} numberOfLines={2}>
            📝 {item.extractedText}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.captureButton}
        onPress={() => router.push("/capture")}
      >
        <Text style={styles.captureButtonText}>📷 Capture New Survey</Text>
      </TouchableOpacity>

      <FlatList
        data={surveys}
        renderItem={renderSurveyItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No surveys captured yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the button above to capture a handwritten survey
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  captureButton: {
    backgroundColor: "#1B5E20",
    padding: 16,
    margin: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  captureButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  surveyCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  surveyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  surveyTitle: { fontSize: 16, fontWeight: "bold", color: "#333", flex: 1 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  surveyMeta: { fontSize: 13, color: "#666", marginBottom: 4 },
  extractedText: {
    fontSize: 13,
    color: "#444",
    fontStyle: "italic",
    marginTop: 8,
    backgroundColor: "#F5F5F5",
    padding: 8,
    borderRadius: 8,
  },
  emptyState: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: "bold", color: "#333" },
  emptySubtext: { fontSize: 14, color: "#666", marginTop: 8, textAlign: "center" },
});
