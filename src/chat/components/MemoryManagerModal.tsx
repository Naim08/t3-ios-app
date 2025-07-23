import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { Modal, BottomSheetModal } from '@gorhom/bottom-sheet';
import { useTheme } from '../../components/ThemeProvider';
import { Typography, Card, IconButton } from '../../ui/atoms';
import { PartnerPersonaService, ConversationMemory } from '../../services/partnerPersonaService';
import { ConfirmationModal, ConfirmationModalRef } from '../../components/ConfirmationModal';

interface MemoryManagerModalProps {
  isVisible: boolean;
  onClose: () => void;
  partnerPersonaId?: string;
}

export const MemoryManagerModal: React.FC<MemoryManagerModalProps> = ({
  isVisible,
  onClose,
  partnerPersonaId,
}) => {
  const { theme } = useTheme();
  const [memories, setMemories] = useState<ConversationMemory[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingMemory, setEditingMemory] = useState<ConversationMemory | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editImportance, setEditImportance] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [filterType, setFilterType] = useState<ConversationMemory['memory_type'] | 'all'>('all');
  const [timeline, setTimeline] = useState<any>(null);
  
  // Modal refs and state
  const confirmationModalRef = useRef<ConfirmationModalRef>(null);
  const [pendingDeleteMemory, setPendingDeleteMemory] = useState<ConversationMemory | null>(null);

  useEffect(() => {
    if (isVisible && partnerPersonaId) {
      loadMemories();
      loadTimeline();
    }
  }, [isVisible, partnerPersonaId, filterType]);

  const loadMemories = async () => {
    if (!partnerPersonaId) return;
    
    setLoading(true);
    try {
      const memoryType = filterType === 'all' ? undefined : filterType;
      const allMemories = await PartnerPersonaService.getAllMemories(partnerPersonaId, memoryType);
      setMemories(allMemories);
    } catch (error) {
      console.error('❌ Error loading memories:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTimeline = async () => {
    if (!partnerPersonaId) return;
    
    try {
      const timelineData = await PartnerPersonaService.getRelationshipTimeline(partnerPersonaId);
      setTimeline(timelineData);
    } catch (error) {
      console.error('❌ Error loading timeline:', error);
    }
  };

  const handleDeleteMemory = (memory: ConversationMemory) => {
    setPendingDeleteMemory(memory);
    confirmationModalRef.current?.present();
  };

  const confirmDeleteMemory = async () => {
    if (!pendingDeleteMemory) return;
    
    const result = await PartnerPersonaService.deleteMemory(pendingDeleteMemory.id);
    if (result.success) {
      setMemories(prev => prev.filter(m => m.id !== pendingDeleteMemory.id));
    } else {
      // You can add error handling here if needed
      console.error('Failed to delete memory');
    }
    setPendingDeleteMemory(null);
  };

  const handleEditMemory = (memory: ConversationMemory) => {
    setEditingMemory(memory);
    setEditContent(memory.content);
    setEditImportance(memory.importance_level);
  };

  const handleSaveEdit = async () => {
    if (!editingMemory || !editContent.trim()) return;

    const result = await PartnerPersonaService.updateMemory(editingMemory.id, {
      content: editContent.trim(),
      importance_level: editImportance,
    });

    if (result.success) {
      setMemories(prev =>
        prev.map(m =>
          m.id === editingMemory.id
            ? { ...m, content: editContent.trim(), importance_level: editImportance }
            : m
        )
      );
      setEditingMemory(null);
      setEditContent('');
    } else {
      console.error('Failed to update memory');
    }
  };

  const getMemoryIcon = (type: ConversationMemory['memory_type']) => {
    switch (type) {
      case 'personal_detail': return '👤';
      case 'relationship_milestone': return '🎉';
      case 'shared_experience': return '🌟';
      case 'preference': return '💖';
      case 'emotional_moment': return '💕';
      default: return '💭';
    }
  };

  const getImportanceColor = (level: number) => {
    switch (level) {
      case 5: return theme.colors.red?.['500'] || theme.colors.error;
      case 4: return theme.colors.orange?.['500'] || theme.colors.warning;
      case 3: return theme.colors.blue?.['500'] || theme.colors.brand['500'];
      case 2: return theme.colors.green?.['500'] || theme.colors.success;
      case 1: return theme.colors.gray?.['400'] || theme.colors.textSecondary;
      default: return theme.colors.textSecondary;
    }
  };

  const memoryTypeFilters = [
    { key: 'all' as const, label: 'All Memories', icon: '📝' },
    { key: 'personal_detail' as const, label: 'Personal Details', icon: '👤' },
    { key: 'relationship_milestone' as const, label: 'Milestones', icon: '🎉' },
    { key: 'shared_experience' as const, label: 'Experiences', icon: '🌟' },
    { key: 'preference' as const, label: 'Preferences', icon: '💖' },
    { key: 'emotional_moment' as const, label: 'Emotional Moments', icon: '💕' },
  ];

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <Typography variant="h4" weight="bold">
            💕 Memory Manager
          </Typography>
          <IconButton
            icon="✕"
            onPress={onClose}
            size="sm"
            variant="ghost"
          />
        </View>

        {/* Timeline Stats */}
        {timeline && (
          <Card
            variant="floating"
            padding="md"
            style={[styles.timelineCard, { backgroundColor: theme.colors.pink?.['50'] || theme.colors.brand['50'] }]}
          >
            <Typography variant="h6" weight="bold" color={theme.colors.pink?.['700'] || theme.colors.brand['700']}>
              📅 Relationship Timeline
            </Typography>
            <View style={styles.timelineStats}>
              <View style={styles.statItem}>
                <Typography variant="h5" weight="bold">
                  {timeline.totalDays}
                </Typography>
                <Typography variant="bodySm" color={theme.colors.textSecondary}>
                  Days Together
                </Typography>
              </View>
              <View style={styles.statItem}>
                <Typography variant="h5" weight="bold">
                  {timeline.milestones.length}
                </Typography>
                <Typography variant="bodySm" color={theme.colors.textSecondary}>
                  Milestones
                </Typography>
              </View>
              <View style={styles.statItem}>
                <Typography variant="h5" weight="bold">
                  {memories.filter(m => m.importance_level >= 4).length}
                </Typography>
                <Typography variant="bodySm" color={theme.colors.textSecondary}>
                  Important Memories
                </Typography>
              </View>
            </View>
            
            {timeline.upcomingAnniversaries.length > 0 && (
              <View style={styles.upcomingSection}>
                <Typography variant="bodyMd" weight="semibold">
                  🎊 Next Anniversary: {timeline.upcomingAnniversaries[0].title}
                </Typography>
                <Typography variant="bodySm" color={theme.colors.textSecondary}>
                  {timeline.upcomingAnniversaries[0].daysUntil} days away
                </Typography>
              </View>
            )}
          </Card>
        )}

        {/* Filter Buttons */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
          contentContainerStyle={styles.filterContent}
        >
          {memoryTypeFilters.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              onPress={() => setFilterType(filter.key)}
              style={[
                styles.filterButton,
                {
                  backgroundColor: filterType === filter.key
                    ? theme.colors.brand['500']
                    : theme.colors.surface,
                  borderColor: filterType === filter.key
                    ? theme.colors.brand['500']
                    : theme.colors.border,
                }
              ]}
            >
              <Typography variant="bodySm">
                {filter.icon} {filter.label}
              </Typography>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Memory List */}
        <ScrollView
          style={styles.memoryList}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadMemories} />
          }
        >
          {memories.length === 0 ? (
            <Card variant="elevated" padding="lg" style={styles.emptyState}>
              <Typography variant="h6" style={{ textAlign: 'center', marginBottom: 8 }}>
                💭
              </Typography>
              <Typography variant="bodyMd" style={{ textAlign: 'center' }}>
                {filterType === 'all'
                  ? 'No memories stored yet. Start chatting to create memories!'
                  : `No ${memoryTypeFilters.find(f => f.key === filterType)?.label.toLowerCase()} found.`}
              </Typography>
            </Card>
          ) : (
            memories.map((memory) => (
              <Card
                key={memory.id}
                variant="elevated"
                padding="md"
                style={styles.memoryCard}
              >
                <View style={styles.memoryHeader}>
                  <View style={styles.memoryTypeContainer}>
                    <Typography variant="h6">
                      {getMemoryIcon(memory.memory_type)}
                    </Typography>
                    <View style={styles.memoryInfo}>
                      <Typography variant="bodySm" weight="semibold" color={theme.colors.textSecondary}>
                        {memory.memory_type.replace('_', ' ').toUpperCase()}
                      </Typography>
                      <View
                        style={[
                          styles.importanceDot,
                          { backgroundColor: getImportanceColor(memory.importance_level) }
                        ]}
                      />
                    </View>
                  </View>
                  <View style={styles.memoryActions}>
                    <IconButton
                      icon="✏️"
                      onPress={() => handleEditMemory(memory)}
                      size="sm"
                      variant="ghost"
                    />
                    <IconButton
                      icon="🗑️"
                      onPress={() => handleDeleteMemory(memory)}
                      size="sm"
                      variant="ghost"
                    />
                  </View>
                </View>

                <Typography variant="bodyMd" style={styles.memoryContent}>
                  {memory.content}
                </Typography>

                {memory.context && (
                  <Typography variant="bodySm" color={theme.colors.textSecondary} style={styles.memoryContext}>
                    Context: {memory.context}
                  </Typography>
                )}

                <View style={styles.memoryFooter}>
                  <Typography variant="bodySm" color={theme.colors.textSecondary}>
                    {new Date(memory.created_at).toLocaleDateString()}
                  </Typography>
                  {memory.tags.length > 0 && (
                    <View style={styles.tags}>
                      {memory.tags.slice(0, 3).map((tag, index) => (
                        <View key={index} style={[styles.tag, { backgroundColor: theme.colors.brand['100'] }]}>
                          <Typography variant="bodySm" color={theme.colors.brand['700']}>
                            {tag}
                          </Typography>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </Card>
            ))
          )}
        </ScrollView>

        {/* Edit Modal */}
        {editingMemory && (
          <Modal
            visible={!!editingMemory}
            animationType="slide"
            presentationStyle="formSheet"
            onRequestClose={() => setEditingMemory(null)}
          >
            <View style={[styles.editModal, { backgroundColor: theme.colors.background }]}>
              <View style={styles.editHeader}>
                <Typography variant="h5" weight="bold">
                  Edit Memory
                </Typography>
                <IconButton
                  icon="✕"
                  onPress={() => setEditingMemory(null)}
                  size="sm"
                  variant="ghost"
                />
              </View>

              <ScrollView style={styles.editContent}>
                <Typography variant="bodyMd" weight="semibold" style={styles.editLabel}>
                  Memory Content
                </Typography>
                <TextInput
                  style={[
                    styles.editTextInput,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    }
                  ]}
                  value={editContent}
                  onChangeText={setEditContent}
                  multiline
                  numberOfLines={4}
                  placeholder="Enter memory content..."
                  placeholderTextColor={theme.colors.textSecondary}
                />

                <Typography variant="bodyMd" weight="semibold" style={styles.editLabel}>
                  Importance Level
                </Typography>
                <View style={styles.importanceSelector}>
                  {[1, 2, 3, 4, 5].map((level) => (
                    <TouchableOpacity
                      key={level}
                      onPress={() => setEditImportance(level as 1 | 2 | 3 | 4 | 5)}
                      style={[
                        styles.importanceButton,
                        {
                          backgroundColor: editImportance === level
                            ? getImportanceColor(level)
                            : theme.colors.surface,
                          borderColor: getImportanceColor(level),
                        }
                      ]}
                    >
                      <Typography
                        variant="bodySm"
                        weight="bold"
                        color={editImportance === level ? '#fff' : getImportanceColor(level)}
                      >
                        {level}
                      </Typography>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <View style={styles.editActions}>
                <TouchableOpacity
                  onPress={() => setEditingMemory(null)}
                  style={[styles.editButton, { backgroundColor: theme.colors.surface }]}
                >
                  <Typography variant="bodyMd">Cancel</Typography>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveEdit}
                  style={[styles.editButton, { backgroundColor: theme.colors.brand['500'] }]}
                >
                  <Typography variant="bodyMd" color="#fff" weight="semibold">
                    Save Changes
                  </Typography>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}
      </View>
      
      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        ref={confirmationModalRef}
        type="danger"
        title="Delete Memory"
        message={pendingDeleteMemory ? `Are you sure you want to delete this memory?\n\n"${pendingDeleteMemory.content}"` : ''}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteMemory}
        onCancel={() => setPendingDeleteMemory(null)}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  timelineCard: {
    margin: 16,
    marginBottom: 8,
  },
  timelineStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  upcomingSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
  },
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterContent: {
    paddingRight: 16,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  memoryList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyState: {
    marginTop: 40,
  },
  memoryCard: {
    marginBottom: 12,
  },
  memoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  memoryTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memoryInfo: {
    marginLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  importanceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 6,
  },
  memoryActions: {
    flexDirection: 'row',
  },
  memoryContent: {
    marginBottom: 8,
  },
  memoryContext: {
    marginBottom: 8,
    fontStyle: 'italic',
  },
  memoryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tags: {
    flexDirection: 'row',
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 4,
  },
  editModal: {
    flex: 1,
    paddingTop: 50,
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  editContent: {
    flex: 1,
    padding: 16,
  },
  editLabel: {
    marginBottom: 8,
    marginTop: 16,
  },
  editTextInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  importanceSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  importanceButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editActions: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  editButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
}); 