import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, TouchableWithoutFeedback } from 'react-native';

export type RestaurantInfo = {
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  cuisine?: string;
  amenity?: string;
  openingHours?: string;
  description?: string;
  // Enhanced details from Mapbox Geocoding API
};

export type RestaurantBottomSheetRef = { open: (info: RestaurantInfo) => void; close: () => void };

// Shows restaurant details; UI is a slide-up bottom sheet with name, meta, and a primary button
const RestaurantBottomSheet = forwardRef<RestaurantBottomSheetRef, { onGetDirections: () => void; isLoadingRoute?: boolean }>(
  ({ onGetDirections, isLoadingRoute = false }, ref) => {
    const [info, setInfo] = useState<RestaurantInfo | null>(null);
    const [visible, setVisible] = useState(false);

    // Exposes imperative methods for opening with data and closing the sheet
    useImperativeHandle(ref, () => ({
      open: (i: RestaurantInfo) => {
        setInfo(i);
        setVisible(true);
      },
      close: () => setVisible(false),
    }));

    return (
      <Modal
        transparent
        animationType="slide"
        visible={visible}
        onRequestClose={() => setVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setVisible(false)}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>
        <View style={styles.sheet}> 
          <View style={styles.container}>
            <Text style={styles.title}>{info?.name ?? 'Restaurant'}</Text>
            
            {/* Display establishment cuisine */}
            {!!info?.amenity && (
              <Text style={styles.meta}>
                 🍽️{'  '}
                {Array.isArray(info.amenity)
                  ? info.amenity.map((item: string, idx: number) => (idx === 0 ? item : `, ${item}`)).join('')
                  : info.amenity}
              </Text>
            )}
            
            
            {/* Contact and location information */}
            {!!info?.address && <Text style={styles.meta}>📍 {info.address}</Text>}
            
            <Pressable
              style={[
                styles.primary,
                { backgroundColor: isLoadingRoute ? '#888888' : 'rgb(21, 212, 0)' }
              ]}
              onPress={isLoadingRoute ? undefined : () => {
                setVisible(false);
                onGetDirections();
              }}
              disabled={isLoadingRoute}
            >
              <Text style={styles.primaryText}>
                {isLoadingRoute ? 'Searching Route...' : 'Get Crime‑Safe Direction'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }
);

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontWeight: '700', fontSize: 18, marginBottom: 8, color: '#000' },
  meta: { color: '#666', marginTop: 10, marginBottom: 4, fontSize: 14 },
  description: { 
    color: '#444',
    fontSize: 14, 
    fontStyle: 'italic', 
    marginBottom: 8, 
    lineHeight: 20 
  },
  primary: { 
    backgroundColor: 'rgb(21, 212, 0)', 
    borderRadius: 12, 
    paddingVertical: 12, 
    alignItems: 'center', 
    marginTop: 12 
  },
  primaryText: { color: '#FFF', fontWeight: '700', fontSize: 16, },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: { 
    position: 'absolute', 
    left: 0, 
    right: 0, 
    bottom: 0, 
    backgroundColor: '#FFF', 
    borderTopLeftRadius: 16, 
    borderTopRightRadius: 16, 
    paddingBottom: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
});

export default RestaurantBottomSheet;


