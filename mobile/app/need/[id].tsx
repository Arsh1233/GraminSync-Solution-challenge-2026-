// Community Need detail screen - shows AI-analyzed need with SDG tags
import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { database } from "../../lib/database";
import { CommunityNeed } from "../../models";
import { syncEngine } from "../../services/sync-engine";

const SDG_NAMES: Record<number, string> = {
  1: "No Poverty",
  2: "Zero Hunger",
  3: "Good Health & Well-being",
  4: "Quality Education",
  5: "Gender Equality",
  6: "Clean Water & Sanitation",
  7: "Affordable & Clean Energy",
  8: "Decent Work & Economic Growth",
  9: "Industry, Innovation & Infrastructure",
  10: "Reduced Inequalities",
  11: "Sustainable Cities & Communities",
  12: "Responsible Consumption & Production",
  13: "Climate Action",
  14: "Life Below Water",
  15: "Life on Land",
  16: "Peace, Justice & Strong Institutions",
  17: "Partnerships for the Goals",
};

export default function NeedDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [need, setNeed] = useState<CommunityNeed | null>(null);

  useEffect(() => {
    if (id) {
      database
        .get<CommunityNeed>("community_needs")
        .find(id)
        .then(setNeed)
        .catch(console.error);
    }
  }, [id]);

  const handleRequestMatch = async () => {
    if (!need) return;
    try {
      await syncEngine.requestVolunteerMatching(need.id);
      Alert.alert("Matching Requested", "The optimization engine will find the best volunteer match.");
    } catch (error) {
      Alert.alert("Error", "Could not request matching. Are you online?");
    }
  };

  if (!need) {
    return (
      <View style={styles.loading}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "#D32F2F";
    if (score >= 60) return "#FF9800";
    if (score >= 40) return "#FFC107";
    return "#4CAF50";
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{need.title}</Text>
        <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(need.vulnerabilityScore) }]}>
          <Text style={styles.scoreText}>Vulnerability: {need.vulnerabilityScore}/100</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>{need.description}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>UN SDG Tags</Text>
        <View style={styles.tagsRow}>
          {need.sdgTags.map((sdg) => (
            <View key={sdg} style={styles.sdgTag}>
              <Text style={styles.sdgTagText}>
                SDG {sdg}: {SDG_NAMES[sdg] ?? "Unknown"}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location</Text>
        <Text style={styles.locationText}>
          📍 {need.locationLat?.toFixed(4)}, {need.locationLng?.toFixed(4)}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Status</Text>
        <Text style={styles.statusText}>{need.status.toUpperCase()}</Text>
      </View>

      {need.status === "open" && (
        <TouchableOpacity style={styles.matchButton} onPress={handleRequestMatch}>
          <Text style={styles.matchButtonText}>🤝 Request Volunteer Match</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { backgroundColor: "#fff", padding: 20, marginBottom: 8 },
  title: { fontSize: 22, fontWeight: "bold", color: "#333", marginBottom: 12 },
  scoreBadge: { alignSelf: "flex-start", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  scoreText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  section: { backgroundColor: "#fff", padding: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 14, fontWeight: "600", color: "#888", marginBottom: 8, textTransform: "uppercase" },
  description: { fontSize: 16, color: "#333", lineHeight: 24 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sdgTag: { backgroundColor: "#E8F5E9", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  sdgTagText: { fontSize: 13, color: "#1B5E20", fontWeight: "500" },
  locationText: { fontSize: 16, color: "#333" },
  statusText: { fontSize: 16, fontWeight: "bold", color: "#1B5E20" },
  matchButton: {
    backgroundColor: "#1B5E20",
    padding: 16,
    margin: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  matchButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
