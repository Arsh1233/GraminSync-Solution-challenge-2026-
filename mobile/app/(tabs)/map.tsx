// CVI Heatmap screen - Community Vulnerability Index visualization
// Uses Google Maps SDK to display hotspots of community needs
import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import MapView, { Heatmap, Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { database } from "../../lib/database";
import { CommunityNeed } from "../../models";

interface HeatmapPoint {
  latitude: number;
  longitude: number;
  weight: number;
}

interface NeedMarker {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  vulnerabilityScore: number;
  sdgTags: number[];
  status: string;
}

// Default center: Chhattisgarh, India
const INITIAL_REGION = {
  latitude: 21.2787,
  longitude: 81.8661,
  latitudeDelta: 2.0,
  longitudeDelta: 2.0,
};

export default function CVIMapScreen() {
  const [heatmapPoints, setHeatmapPoints] = useState<HeatmapPoint[]>([]);
  const [markers, setMarkers] = useState<NeedMarker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCommunityNeeds();

    // Subscribe to reactive updates from WatermelonDB
    const subscription = database
      .get<CommunityNeed>("community_needs")
      .query()
      .observe()
      .subscribe((needs) => {
        processNeeds(needs);
      });

    return () => subscription.unsubscribe();
  }, []);

  const loadCommunityNeeds = async () => {
    try {
      const needs = await database
        .get<CommunityNeed>("community_needs")
        .query()
        .fetch();
      processNeeds(needs);
    } catch (error) {
      console.error("Failed to load community needs:", error);
    } finally {
      setLoading(false);
    }
  };

  const processNeeds = (needs: CommunityNeed[]) => {
    const points: HeatmapPoint[] = [];
    const needMarkers: NeedMarker[] = [];

    for (const need of needs) {
      if (need.locationLat != null && need.locationLng != null) {
        points.push({
          latitude: need.locationLat,
          longitude: need.locationLng,
          weight: need.vulnerabilityScore / 100, // Normalize to 0-1
        });

        needMarkers.push({
          id: need.id,
          title: need.title,
          latitude: need.locationLat,
          longitude: need.locationLng,
          vulnerabilityScore: need.vulnerabilityScore,
          sdgTags: need.sdgTags,
          status: need.status,
        });
      }
    }

    setHeatmapPoints(points);
    setMarkers(needMarkers);
  };

  const getMarkerColor = (score: number): string => {
    if (score >= 80) return "#D32F2F"; // Critical
    if (score >= 60) return "#FF9800"; // High
    if (score >= 40) return "#FFC107"; // Medium
    return "#4CAF50"; // Low
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1B5E20" />
        <Text style={styles.loadingText}>Loading vulnerability data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={INITIAL_REGION}
        showsUserLocation
        showsMyLocationButton
      >
        {/* CVI Heatmap Layer */}
        {heatmapPoints.length > 0 && (
          <Heatmap
            points={heatmapPoints}
            radius={50}
            opacity={0.7}
            gradient={{
              colors: ["#4CAF50", "#FFC107", "#FF9800", "#D32F2F"],
              startPoints: [0.1, 0.3, 0.6, 0.9],
              colorMapSize: 256,
            }}
          />
        )}

        {/* Individual Need Markers */}
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            coordinate={{
              latitude: marker.latitude,
              longitude: marker.longitude,
            }}
            title={marker.title}
            description={`Vulnerability: ${marker.vulnerabilityScore}/100 | SDGs: ${marker.sdgTags.join(", ")} | Status: ${marker.status}`}
            pinColor={getMarkerColor(marker.vulnerabilityScore)}
          />
        ))}
      </MapView>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Community Vulnerability Index</Text>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: "#D32F2F" }]} />
          <Text style={styles.legendLabel}>Critical (80-100)</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: "#FF9800" }]} />
          <Text style={styles.legendLabel}>High (60-79)</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: "#FFC107" }]} />
          <Text style={styles.legendLabel}>Medium (40-59)</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: "#4CAF50" }]} />
          <Text style={styles.legendLabel}>Low (0-39)</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  loadingText: { marginTop: 12, fontSize: 16, color: "#666" },
  legend: {
    position: "absolute",
    bottom: 20,
    left: 16,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 12,
    padding: 12,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  legendTitle: { fontSize: 14, fontWeight: "bold", marginBottom: 8, color: "#333" },
  legendRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  legendDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  legendLabel: { fontSize: 12, color: "#555" },
});
