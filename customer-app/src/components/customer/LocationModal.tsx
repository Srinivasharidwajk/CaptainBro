import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LocationModalProps {
  visible: boolean;
  selectedLocation: string;
  isDetectingGps: boolean;
  onClose: () => void;
  onSelectLocation: (loc: string) => void;
  onDetectGps: () => void;
}

const PRESET_LOCATIONS = [
  'Warangal, Hanamkonda',
  'Kazipet Main Road',
  'Subedari & Waddepally',
  'NIT Warangal Campus',
  'Hunter Road & Naimnagar',
];

export default function LocationModal({
  visible,
  selectedLocation,
  isDetectingGps,
  onClose,
  onSelectLocation,
  onDetectGps,
}: LocationModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.modalIndicator} />
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalTitle}>Select Delivery Location</Text>
          <Text style={styles.modalSub}>
            Select your preferred area in Warangal, Hanamkonda, or Kazipet for instant 30-min delivery.
          </Text>

          <TouchableOpacity
            style={styles.gpsDetectBtn}
            activeOpacity={0.8}
            onPress={onDetectGps}
            disabled={isDetectingGps}
          >
            <Ionicons name="navigate-circle" size={20} color="#FFFFFF" />
            <Text style={styles.gpsDetectBtnText}>
              {isDetectingGps ? 'Detecting GPS...' : 'Detect Current GPS Location'}
            </Text>
          </TouchableOpacity>

          <View style={styles.locationOptionList}>
            {PRESET_LOCATIONS.map((loc) => {
              const isSelected = selectedLocation === loc;
              return (
                <TouchableOpacity
                  key={loc}
                  onPress={() => onSelectLocation(loc)}
                  style={[styles.locationOption, isSelected && styles.locationOptionSelected]}
                >
                  <Ionicons
                    name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                    size={18}
                    color={isSelected ? '#8B0000' : '#9CA3AF'}
                  />
                  <Text
                    style={[
                      styles.locationOptionText,
                      isSelected && styles.locationOptionTextSelected,
                    ]}
                  >
                    {loc}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity onPress={onClose} style={styles.modalButton}>
            <Text style={styles.modalBtnText}>Confirm Location</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
  },
  closeBtn: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 18,
  },
  gpsDetectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B0000',
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  gpsDetectBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  locationOptionList: {
    gap: 8,
    marginBottom: 16,
  },
  locationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    gap: 10,
  },
  locationOptionSelected: {
    borderColor: '#8B0000',
    backgroundColor: '#FEF2F2',
  },
  locationOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  locationOptionTextSelected: {
    color: '#8B0000',
    fontWeight: '700',
  },
  modalButton: {
    backgroundColor: '#111827',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
