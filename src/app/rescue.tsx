import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { CheckRow } from '@/components/check-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { generateRecipe, hasRecipeApiKey, type Recipe } from '@/lib/api/recipes';
import { useIsPro } from '@/lib/purchases';
import { CATEGORIES } from '@/lib/categories';
import { addDays, daysUntil } from '@/lib/rules/dates';
import { findRescueCandidates, RESCUE_WINDOW_DAYS } from '@/lib/rules/urgency';
import { withCelebration } from '@/store/game';
import { useItems } from '@/store/items';

function whenLabel(days: number): string {
  if (days === 0) return 'expires today';
  if (days === 1) return 'expires tomorrow';
  return `expires in ${days} days`;
}

function RecipeCard({ recipe }: { recipe: Recipe }) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { borderColor: theme.border }]}>
      <ThemedText type="subtitle" style={styles.recipeTitle}>
        {recipe.title}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {recipe.minutes} min · serves {recipe.servings}
        {recipe.source === 'offline' ? ' · offline recipe' : ''}
      </ThemedText>

      <ThemedText type="smallBold" style={styles.section}>
        Ingredients
      </ThemedText>
      {recipe.ingredients.map((ing, i) => (
        <ThemedText key={i} type="small">
          {ing.fromFridge ? '🟢 ' : '• '}
          {ing.amount} {ing.name}
        </ThemedText>
      ))}

      <ThemedText type="smallBold" style={styles.section}>
        Method
      </ThemedText>
      {recipe.steps.map((step, i) => (
        <View key={i} style={styles.step}>
          <ThemedText type="smallBold" style={{ color: theme.tint }}>
            {i + 1}
          </ThemedText>
          <ThemedText type="small" style={{ flex: 1 }}>
            {step}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

export default function RescueScreen() {
  const insets = useSafeAreaInsets();
  const items = useItems((s) => s.items);
  const markUsed = useItems((s) => s.markUsed);
  const addItem = useItems((s) => s.addItem);
  const [leftovers, setLeftovers] = useState(false);
  const isPro = useIsPro();
  const aiRecipes = isPro && hasRecipeApiKey;

  // Snapshot once so the list doesn't shift under the user mid-flow.
  const [now] = useState(() => new Date());
  const [candidates] = useState(() => findRescueCandidates(items, now));
  const [selected, setSelected] = useState(() => new Set(candidates.map((item) => item.id)));
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(false);

  const picked = candidates.filter((item) => selected.has(item.id));

  const toggle = (id: string) => {
    setRecipe(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const makeRecipe = async () => {
    setLoading(true);
    setRecipe(await generateRecipe(picked, { ai: aiRecipes }));
    setLoading(false);
  };

  const cooked = () => {
    withCelebration(() => {
      markUsed(picked.map((item) => item.id));
      // Leftovers are the food most often forgotten, so track them straight away.
      if (leftovers && recipe) {
        addItem({
          // "Rescue skillet: greek yoghurt, …" → "Leftovers: rescue skillet"
          name: `Leftovers: ${recipe.title.split(':')[0].trim().toLowerCase()}`.slice(0, 40),
          category: 'leftovers',
          quantity: 1,
          expiresAt: addDays(new Date(), CATEGORIES.leftovers.defaultShelfLifeDays).toISOString(),
        });
      }
    }, `rescued ${picked.length} item${picked.length === 1 ? '' : 's'}`);
    router.back();
  };

  if (candidates.length === 0) {
    return (
      <ThemedView style={[styles.container, styles.empty]}>
        <ThemedText style={{ textAlign: 'center' }}>
          Nothing needs rescuing right now. Items show up here {RESCUE_WINDOW_DAYS} days before they expire.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <ThemedText themeColor="textSecondary">
          These are about to go off. Pick what you want to cook with and get one recipe that uses them all.
        </ThemedText>

        {candidates.map((item) => (
          <CheckRow
            key={item.id}
            checked={selected.has(item.id)}
            onToggle={() => toggle(item.id)}
            title={item.quantity > 1 ? `${item.name} × ${item.quantity}` : item.name}
            subtitle={whenLabel(daysUntil(item.expiresAt, now))}
          />
        ))}

        {!recipe && (
          <Button
            label={aiRecipes ? '✨ Get an AI recipe' : 'Get a quick recipe'}
            onPress={makeRecipe}
            loading={loading}
            disabled={picked.length === 0}
            style={styles.cta}
          />
        )}

        {recipe && (
          <>
            <RecipeCard recipe={recipe} />
            <View style={styles.leftovers}>
              <View style={{ flex: 1 }}>
                <ThemedText type="mono">there&apos;ll be leftovers</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Adds them to your fridge with a {CATEGORIES.leftovers.defaultShelfLifeDays}-day date
                </ThemedText>
              </View>
              <Switch value={leftovers} onValueChange={setLeftovers} />
            </View>
            <Button label={`I cooked it — rescue ${picked.length} item${picked.length === 1 ? '' : 's'}`} onPress={cooked} />
            {aiRecipes ? (
              <Button label="Try another recipe" variant="outline" onPress={makeRecipe} loading={loading} />
            ) : (
              <Button label="✨ Get a chef-quality AI recipe with Pro" variant="outline" onPress={() => router.push('/paywall')} />
            )}
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 10 },
  empty: { justifyContent: 'center', padding: 32 },
  cta: { marginTop: 8 },
  card: { borderWidth: 1.5, borderRadius: 6, padding: 18, gap: 4, marginTop: 8 },
  recipeTitle: { fontSize: 20, lineHeight: 26 },
  section: { marginTop: 12, marginBottom: 2 },
  step: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  leftovers: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
});
