// Survey capture screen - uses Expo Camera to photograph handwritten surveys
import { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  ScrollView,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { saveSurvey } from "../services/survey-capture";

type CaptureStep = "camera" | "review" | "details";

export default function CaptureScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState<CaptureStep>("camera");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("hi");
  const [saving, setSaving] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          GraminSync needs camera access to capture handwritten surveys for
          digitization.
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestPermission}
        >
          <Text style={styles.permissionButtonText}>Grant Camera Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });
      if (photo) {
        setImageUri(photo.uri);
        setStep("review");
      }
    } catch (error) {
      Alert.alert("Capture Error", "Failed to take photo. Please try again.");
      console.error("Camera capture error:", error);
    }
  };

  const handleRetake = () => {
    setImageUri(null);
    setStep("camera");
  };

  const handleSave = async () => {
    if (!imageUri || !title.trim()) {
      Alert.alert("Missing Info", "Please provide a title for this survey.");
      return;
    }

    setSaving(true);
    try {
      const result = await saveSurvey(
        imageUri,
        title.trim(),
        "current-user", // Would come from auth context
        language
      );

      Alert.alert(
        "Survey Saved! ✅",
        `Survey "${title}" saved locally. It will sync automatically when you have internet connectivity.`,
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert("Save Error", "Failed to save survey. Please try again.");
      console.error("Survey save error:", error);
    } finally {
      setSaving(false);
    }
  };

  if (step === "camera") {
    return (
      <View style={styles.container}>
        <CameraView style={styles.camera} ref={cameraRef}>
          <View style={styles.cameraOverlay}>
            <Text style={styles.cameraGuide}>
              📋 Position the handwritten survey within the frame
            </Text>
            <View style={styles.frameGuide} />
            <TouchableOpacity
              style={styles.captureButton}
              onPress={handleCapture}
            >
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    );
  }

  if (step === "review" && imageUri) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: imageUri }} style={styles.previewImage} />
        <View style={styles.reviewActions}>
          <TouchableOpacity
            style={[styles.reviewButton, { backgroundColor: "#F44336" }]}
            onPress={handleRetake}
          >
            <Text style={styles.reviewButtonText}>🔄 Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.reviewButton, { backgroundColor: "#4CAF50" }]}
            onPress={() => setStep("details")}
          >
            <Text style={styles.reviewButtonText}>✅ Use Photo</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Details step
  return (
    <ScrollView style={styles.detailsContainer}>
      {imageUri && (
        <Image
          source={{ uri: imageUri }}
          style={styles.thumbnailImage}
        />
      )}

      <View style={styles.form}>
        <Text style={styles.label}>Survey Title *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g., Village Water Supply Survey - Ward 5"
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Language of Survey</Text>
        <View style={styles.languageRow}>
          {[
            { code: "hi", label: "हिंदी (Hindi)" },
            { code: "ur", label: "اردو (Urdu)" },
            { code: "en", label: "English" },
          ].map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.languageChip,
                language === lang.code && styles.languageChipActive,
              ]}
              onPress={() => setLanguage(lang.code)}
            >
              <Text
                style={[
                  styles.languageChipText,
                  language === lang.code && styles.languageChipTextActive,
                ]}
              >
                {lang.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? "Saving..." : "💾 Save Survey (Offline)"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.offlineNote}>
          📡 This survey will be saved locally and automatically synced when
          internet connectivity is available. The AI pipeline will then extract
          and analyze the handwritten text.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  cameraOverlay: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 40,
  },
  cameraGuide: {
    color: "#fff",
    fontSize: 14,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  frameGuide: {
    width: "85%",
    height: "60%",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
    borderRadius: 12,
    borderStyle: "dashed",
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
  },
  previewImage: { flex: 1 },
  reviewActions: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#000",
    justifyContent: "space-around",
  },
  reviewButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  reviewButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#F5F5F5",
  },
  permissionText: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: "#1B5E20",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  permissionButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  detailsContainer: { flex: 1, backgroundColor: "#F5F5F5" },
  thumbnailImage: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  form: { padding: 16 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  languageRow: { flexDirection: "row", gap: 8 },
  languageChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  languageChipActive: {
    backgroundColor: "#1B5E20",
    borderColor: "#1B5E20",
  },
  languageChipText: { fontSize: 14, color: "#333" },
  languageChipTextActive: { color: "#fff" },
  saveButton: {
    backgroundColor: "#1B5E20",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 24,
  },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  offlineNote: {
    fontSize: 12,
    color: "#888",
    textAlign: "center",
    marginTop: 16,
    lineHeight: 18,
  },
});
