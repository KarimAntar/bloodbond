import React, { useEffect, useState } from 'react';
import { Alert as RNAlert } from 'react-native';
import CustomModal from '../components/CustomModal';

type AlertButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive' | undefined;
};

type InternalModal = {
  id: number;
  title: string;
  message?: string;
  buttons: AlertButton[];
};

let listeners: ((m: InternalModal | null) => void)[] = [];
let nextId = 1;

/**
 * Show a modal using the hosted CustomModal.
 * This mirrors Alert.alert(title, message?, buttons?, options?)
 */
export function showModal(title: string, message?: string, buttons?: AlertButton[]) {
  const btns = buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }];
  const modal: InternalModal = {
    id: nextId++,
    title,
    message,
    buttons: btns,
  };
  listeners.forEach((l) => l(modal));
  return modal.id;
}

/**
 * Hide current modal (dismiss).
 */
export function hideModal() {
  listeners.forEach((l) => l(null));
}

/**
 * Replace React Native Alert.alert with a function that uses the CustomModal host.
 * Call this once at app startup (e.g. from app/_layout.tsx).
 */
export function overrideAlert() {
  try {
    // @ts-ignore - we intentionally override for app-wide behavior
    RNAlert.alert = (title: string, message?: string, buttons?: any, options?: any) => {
      // Normalize buttons into our AlertButton[]
      let normalized: AlertButton[] = [];
      if (Array.isArray(buttons)) {
        normalized = buttons.map((b: any) => ({
          text: b.text ?? String(b),
          onPress: typeof b.onPress === 'function' ? b.onPress : undefined,
          style: b.style,
        }));
      } else if (typeof buttons === 'object' && buttons !== null) {
        // Rare case: buttons provided as one object? fall back to single OK
        normalized = [{ text: 'OK' }];
      } else {
        normalized = [{ text: 'OK' }];
      }

      // Show modal via host
      showModal(title, message, normalized);
    };
  } catch (e) {
    // If overriding fails, do nothing
    // eslint-disable-next-line no-console
    console.error('Failed to override Alert.alert', e);
  }
}

/**
 * ModalHost component — mount once at app root.
 * It listens for showModal/hideModal and renders CustomModal.
 */
export const ModalHost: React.FC = () => {
  const [modal, setModal] = useState<InternalModal | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const listener = (m: InternalModal | null) => {
      setModal(m);
      setVisible(Boolean(m));
    };
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  if (!modal) return null;

  // Map buttons: if there are two buttons, treat first as cancel, second as confirm
  const hasCancel = modal.buttons.length > 1;
  const first = modal.buttons[0];
  const second = modal.buttons[1];

  const handleClose = () => {
    setVisible(false);
    // allow host to clear modal after dismiss animation
    setTimeout(() => setModal(null), 200);
  };

  const onConfirm = () => {
    // If second button exists, call it. Otherwise call first.
    const target = second ?? first;
    try {
      target.onPress && target.onPress();
    } catch (e) {
      // swallow errors from user callbacks
      // eslint-disable-next-line no-console
      console.error('Modal button onPress error', e);
    }
    handleClose();
  };

  const onCancel = () => {
    // Call first button's onPress if it looks like a cancel
    const target = hasCancel ? first : undefined;
    try {
      target?.onPress && target.onPress();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Modal button onPress error', e);
    }
    handleClose();
  };

  // Choose texts
  const confirmText = second?.text ?? first?.text ?? 'OK';
  const cancelText = hasCancel ? first.text : undefined;

  // Determine modal type by presence of destructive style on any button
  const type = modal.buttons.some((b) => b.style === 'destructive') ? 'warning' : 'info';

  return (
    <CustomModal
      visible={visible}
      onClose={handleClose}
      title={modal.title}
      message={modal.message ?? ''}
      onConfirm={onConfirm}
      onCancel={hasCancel ? onCancel : undefined}
      confirmText={confirmText}
      cancelText={cancelText}
      type={type as any}
    />
  );
};

export default {
  showModal,
  hideModal,
  overrideAlert,
  ModalHost,
};
