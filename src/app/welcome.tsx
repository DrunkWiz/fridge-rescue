import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Creature } from '@/components/creature/creature';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { useGame } from '@/store/game';
import { useItems } from '@/store/items';

const STEPS = 3;

function Dots({ step }: { step: number }) {
  const theme = useTheme();
  return (
    <View style={styles.dots}>
      {Array.from({ length: STEPS }, (_, i) => (
        <View key={i} style={[styles.dot, { backgroundColor: i === step ? theme.text : theme.backgroundSelected }]} />
      ))}
    </View>
  );
}

function Explainer({ title, body, color }: { title: string; body: string; color: string }) {
  return (
    <View style={[styles.card, { borderColor: color }]}>
      <ThemedText type="mono" style={{ color, fontWeight: 700 }}>
        {title}
      </ThemedText>
      <ThemedText type="small">{body}</ThemedText>
    </View>
  );
}

/** First launch: meet the pet, learn the two branches, put some food in. Three screens, skippable. */
export default function WelcomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const finish = useGame((s) => s.finishOnboarding);
  const loadDemoData = useItems((s) => s.loadDemoData);
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');

  const pet = (name.trim() || 'sprout').toLowerCase();

  const done = (next?: '/scan' | '/add-item') => {
    finish(name);
    router.replace('/');
    if (next) router.push(next);
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.top}>
          <Dots step={step} />
          {step < STEPS - 1 && (
            <Pressable onPress={() => done()} hitSlop={10}>
              <ThemedText type="mono" themeColor="textSecondary">
                skip
              </ThemedText>
            </Pressable>
          )}
        </View>

        {step === 0 && (
          <View style={styles.body}>
            <Creature mood="content" level={1} />
            <ThemedText type="monoLarge" style={styles.center}>
              this is {pet}.
            </ThemedText>
            <ThemedText type="mono" style={styles.center}>
              it lives on the food you don&apos;t waste. eat things before they go off and it grows. forget them and it wilts.
            </ThemedText>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="give it a name (optional)"
              placeholderTextColor={theme.textSecondary}
              maxLength={16}
              autoCapitalize="none"
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            />
          </View>
        )}

        {step === 1 && (
          <View style={styles.body}>
            <ThemedText type="monoLarge" style={styles.center}>
              two ways to save food
            </ThemedText>
            <Explainer
              title="rescue →"
              body="Fresh food about to go off gets cooked. You get one recipe that uses exactly what's expiring."
              color={theme.warning}
            />
            <Explainer
              title="donate →"
              body="Unopened tins and packets you'll never eat go to a food bank near you, while they still have months left."
              color={theme.tint}
            />
            <View style={[styles.card, { borderColor: theme.border }]}>
              <ThemedText type="mono">→ swipe right: ate it</ThemedText>
              <ThemedText type="mono">← swipe left: binned it</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Every save earns xp and seeds. Mis-swipe? There&apos;s always undo.
              </ThemedText>
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={styles.body}>
            <Creature mood="hungry" level={1} />
            <ThemedText type="monoLarge" style={styles.center}>
              {pet} is hungry.
            </ThemedText>
            <ThemedText type="mono" style={styles.center}>
              put your food in. the fastest way is a photo of your last receipt.
            </ThemedText>
            <Button label="📷 Scan a receipt" onPress={() => done('/scan')} style={styles.wide} />
            <Button label="Add food by hand" variant="outline" onPress={() => done('/add-item')} style={styles.wide} />
            <Pressable
              onPress={() => {
                loadDemoData();
                done();
              }}
              hitSlop={8}>
              <ThemedText type="mono" themeColor="textSecondary">
                [ just exploring? load a demo fridge ]
              </ThemedText>
            </Pressable>
          </View>
        )}

        {step < STEPS - 1 && <Button label="next" onPress={() => setStep(step + 1)} />}
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  flex: { flex: 1 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 10, height: 10 },
  body: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  center: { textAlign: 'center' },
  input: { alignSelf: 'stretch', borderWidth: 1.5, borderRadius: 6, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, textAlign: 'center' },
  card: { alignSelf: 'stretch', borderWidth: 1.5, borderRadius: 6, padding: 14, gap: 4 },
  wide: { alignSelf: 'stretch' },
});
