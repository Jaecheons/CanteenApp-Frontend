// components/PaginationControls.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

/**
 * Drop-in UI for a usePagination() instance. Renders nothing if the list
 * doesn't exceed one page.
 *
 * Usage (typically as a FlatList's ListFooterComponent):
 *   const pagination = usePagination(filteredGroups, 5);
 *   ...
 *   <PaginationControls
 *     {...pagination}
 *     totalCount={filteredGroups.length}
 *     itemLabel="Bookings"
 *   />
 */
export default function PaginationControls({
  hasMore,
  showAll,
  currentPage,
  totalPages,
  totalCount,
  expand,
  collapse,
  nextPage,
  prevPage,
  itemLabel = 'Items',
}) {
  if (!hasMore) return null;

  return (
    <View style={styles.paginationBox}>
      {!showAll ? (
        <TouchableOpacity style={styles.showAllBtn} onPress={expand}>
          <Text style={styles.showAllBtnText}>Show All {itemLabel} ({totalCount})</Text>
        </TouchableOpacity>
      ) : (
        <View>
          <View style={styles.pageNavRow}>
            <TouchableOpacity
              style={[styles.pageNavBtn, currentPage === 1 && styles.pageNavBtnDisabled]}
              onPress={prevPage}
              disabled={currentPage === 1}
            >
              <Text style={[styles.pageNavBtnText, currentPage === 1 && styles.pageNavBtnTextDisabled]}>
                ‹ Prev
              </Text>
            </TouchableOpacity>

            <Text style={styles.pageIndicator}>Page {currentPage} of {totalPages}</Text>

            <TouchableOpacity
              style={[styles.pageNavBtn, currentPage === totalPages && styles.pageNavBtnDisabled]}
              onPress={nextPage}
              disabled={currentPage === totalPages}
            >
              <Text style={[styles.pageNavBtnText, currentPage === totalPages && styles.pageNavBtnTextDisabled]}>
                Next ›
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.showLessBtn} onPress={collapse}>
            <Text style={styles.showLessBtnText}>Show only recent</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  paginationBox: { marginTop: 4, marginBottom: 10 },
  showAllBtn: {
    backgroundColor: '#005f99', paddingVertical: 12,
    borderRadius: 10, alignItems: 'center',
  },
  showAllBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  pageNavRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  pageNavBtn: {
    backgroundColor: '#005f99', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8,
  },
  pageNavBtnDisabled: { backgroundColor: '#e0e0e0' },
  pageNavBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  pageNavBtnTextDisabled: { color: '#aaa' },
  pageIndicator: { fontSize: 13, color: '#555', fontWeight: '600' },
  showLessBtn: { alignItems: 'center', marginTop: 12, paddingVertical: 6 },
  showLessBtnText: { fontSize: 13, color: '#005f99', fontWeight: '600' },
});
