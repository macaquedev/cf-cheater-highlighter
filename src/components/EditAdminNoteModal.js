import React, { useState } from 'react';
import {
  Dialog,
  Portal,
  Button,
  Text,
  Box,
  VStack
} from '@chakra-ui/react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import MarkdownEditor from './MarkdownEditor';
import MarkdownRenderer from './MarkdownRenderer';

const EditAdminNoteModal = ({ isOpen, onClose, cheater, onUpdate, onReturnToEvidence }) => {
  const [adminNote, setAdminNote] = useState(cheater?.adminNote || '');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSave = async () => {
    if (!cheater) return;
    
    setIsLoading(true);
    try {
      const cheaterRef = doc(db, 'cheaters', cheater.id);
      await updateDoc(cheaterRef, {
        adminNote: adminNote.trim() || null
      });
      
      setMessage({ type: 'success', text: 'Admin note updated successfully!' });
      
      // Call the parent's update function to refresh the data
      if (onUpdate) {
        onUpdate({ ...cheater, adminNote: adminNote.trim() || null });
      }
      
      // Close modal after a brief delay and return to evidence modal
      setTimeout(() => {
        const updatedCheater = { ...cheater, adminNote: adminNote.trim() || null };
        onClose();
        setMessage(null);
        if (onReturnToEvidence) {
          onReturnToEvidence(updatedCheater);
        }
      }, 1500);
    } catch (error) {
      console.error('Error updating admin note:', error);
      setMessage({ type: 'error', text: 'Failed to update admin note.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setAdminNote(cheater?.adminNote || '');
    setMessage(null);
    onClose();
    if (onReturnToEvidence) {
      onReturnToEvidence(cheater);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && handleClose()}>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="2xl">
            <Dialog.Header>
              <Dialog.Title color="blue.600" _dark={{ color: "blue.400" }}>
                Edit Admin Note for {cheater?.username}
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <VStack gap={4} align="stretch">
                {message && (
                  <Box 
                    p={4} 
                    rounded="md" 
                    bg={message.type === 'success' ? 'green.100' : 'red.100'}
                    color={message.type === 'success' ? 'green.800' : 'red.800'}
                    borderWidth={1}
                    borderColor={message.type === 'success' ? 'green.200' : 'red.200'}
                    _dark={{
                      bg: message.type === 'success' ? 'green.900' : 'red.900',
                      color: message.type === 'success' ? 'green.200' : 'red.200',
                      borderColor: message.type === 'success' ? 'green.700' : 'red.700'
                    }}
                  >
                    <Text>{message.text}</Text>
                  </Box>
                )}
                
                <Box>
                  <Text fontWeight="bold" mb={2} color="blue.700" _dark={{ color: "blue.300" }}>
                    Admin Note:
                  </Text>
                  <Box 
                    p={4} 
                    bg="gray.50" 
                    borderRadius="md" 
                    borderWidth={1} 
                    borderColor="gray.200" 
                    _dark={{ bg: "gray.700", borderColor: "gray.600" }}
                  >
                    <MarkdownEditor
                      value={adminNote}
                      onChange={setAdminNote}
                      placeholder="Add any additional notes or context for this user..."
                      rows={4}
                    />
                  </Box>
                </Box>
                
                {adminNote.trim() && (
                  <Box>
                    <Text fontWeight="bold" mb={2} color="blue.700" _dark={{ color: "blue.300" }}>
                      Preview:
                    </Text>
                    <Box
                      p={4}
                      bg="white"
                      borderRadius="md"
                      borderWidth={1}
                      borderColor="gray.200"
                      _dark={{ 
                        bg: "gray.600",
                        borderColor: "gray.500" 
                      }}
                      maxH="200px"
                      overflowY="auto"
                      sx={{
                        '& strong': { fontWeight: 'bold' },
                        '& em': { fontStyle: 'italic' },
                        '& code': { 
                          bg: 'gray.100', 
                          px: 1, 
                          py: 0.5, 
                          borderRadius: 'sm', 
                          fontFamily: 'mono',
                          fontSize: 'sm',
                          _dark: { bg: 'gray.700' }
                        },
                        '& pre': {
                          bg: 'gray.50',
                          p: 3,
                          borderRadius: 'md',
                          border: '1px solid',
                          borderColor: 'gray.200',
                          overflowX: 'auto',
                          my: 2,
                          _dark: { 
                            bg: 'gray.700', 
                            borderColor: 'gray.600' 
                          }
                        },
                        '& pre code': {
                          bg: 'transparent',
                          p: 0,
                          borderRadius: 0,
                          fontSize: 'sm',
                          lineHeight: 1.5
                        },
                        '& a': { 
                          color: 'blue.600', 
                          textDecoration: 'underline',
                          _dark: { color: 'blue.300' }
                        }
                      }}
                    >
                      <MarkdownRenderer>{adminNote}</MarkdownRenderer>
                    </Box>
                  </Box>
                )}
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button 
                variant="outline" 
                mr={3} 
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                colorPalette="blue" 
                onClick={handleSave}
                loading={isLoading}
                loadingText="Saving..."
              >
                Save Changes
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};

export default EditAdminNoteModal;