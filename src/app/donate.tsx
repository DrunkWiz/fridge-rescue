import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { CheckRow } from '@/components/check-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { findDropOffs, geocode, SEARCH_RADIUS_KM, type DropOff, type LatLon } from '@/lib/api/overpass';
import {
  DONATION_MIN_DAYS_TO_EXPIRY,
  estimateMeals,
  findDonationCandidates,
  type DonationCandidate,
  type SurplusReason,
} from '@/lib/rules/surplus';
import { useItems } from '@/store/items';

const REASON_LABEL: Record<SurplusReason, string> = {
  quantity: 'more than you need',
  stale: 'untouched for a month',
  duplicate: 'you already have one',
};

type Step = 'box' | 'where' | 'confirm';

function Headline({ units }: { units: number }) {
  const theme = useTheme();
  return (
    <View style={[styles.headline, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="subtitle" style={{ color: theme.tint, fontSize: 28, lineHeight: 34 }}>
        ≈ {estimateMeals(units)} meals
      </ThemedText>
      <ThemedText style={{ textAlign: 'center' }}>
        You have {units} item{units === 1 ? '' : 's'} you&apos;ll probably never eat. That&apos;s about {estimateMeals(units)} meal
        {estimateMeals(units) === 1 ? '' : 's'} for someone.
      </ThemedText>
    </View>
  );
}

function BoxStep({
  candidates,
  selected,
  toggle,
  onNext,
}: {
  candidates: DonationCandidate[];
  selected: Set<string>;
  toggle: (id: string) => void;
  onNext: () => void;
}) {
  const units = candidates.filter((c) => selected.has(c.item.id)).reduce((sum, c) => sum + c.suggestedQuantity, 0);
  return (
    <>
      <Headline units={units} />
      <ThemedText type="small" themeColor="textSecondary">
        Only unopened, long-life food with more than {DONATION_MIN_DAYS_TO_EXPIRY} days left — food banks need time to sort and
        hand it out. Anything expiring sooner belongs in Rescue.
      </ThemedText>
      {candidates.map((c) => (
        <CheckRow
          key={c.item.id}
          checked={selected.has(c.item.id)}
          onToggle={() => toggle(c.item.id)}
          title={c.item.name}
          subtitle={c.reasons.map((r) => REASON_LABEL[r]).join(' · ')}
          trailing={
            <ThemedText type="smallBold" themeColor="textSecondary">
              {c.suggestedQuantity < c.item.quantity ? `${c.suggestedQuantity} of ${c.item.quantity}` : `× ${c.suggestedQuantity}`}
            </ThemedText>
          }
        />
      ))}
      <Button label="Find a drop-off point" onPress={onNext} disabled={units === 0} style={styles.cta} />
    </>
  );
}

function WhereStep({ onPick }: { onPick: (dropOff: DropOff | { name: string }) => void }) {
  const theme = useTheme();
  const [place, setPlace] = useState('');
  const [status, setStatus] = useState<'idle' | 'locating' | 'searching' | 'done'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [results, setResults] = useState<DropOff[]>([]);
  const [customName, setCustomName] = useState('');

  const search = async (origin: LatLon) => {
    setStatus('searching');
    const { dropOffs, osmFailed } = await findDropOffs(origin);
    setResults(dropOffs);
    setStatus('done');
    if (osmFailed) setMessage("Couldn't reach OpenStreetMap. Try again, or add your own drop-off point below.");
    else if (dropOffs.length === 0)
      setMessage(`No food banks are mapped within ${SEARCH_RADIUS_KM} km. Coverage in OpenStreetMap is patchy — add the one you use below.`);
  };

  const useMyLocation = async () => {
    setMessage(null);
    setStatus('locating');
    try {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) {
        setStatus('idle');
        setMessage('Location permission was declined — type a town or postcode instead.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await search({ lat: pos.coords.latitude, lon: pos.coords.longitude });
    } catch {
      setStatus('idle');
      setMessage("Couldn't get your location — type a town or postcode instead.");
    }
  };

  const searchPlace = async () => {
    if (!place.trim()) return;
    setMessage(null);
    setStatus('searching');
    const hit = await geocode(place.trim()).catch(() => null);
    if (!hit) {
      setStatus('idle');
      setMessage(`Couldn't find "${place.trim()}".`);
      return;
    }
    await search(hit);
  };

  const busy = status === 'locating' || status === 'searching';

  return (
    <>
      <Button label="Use my location" onPress={useMyLocation} loading={status === 'locating'} disabled={busy} />
      <View style={styles.searchRow}>
        <TextInput
          value={place}
          onChangeText={setPlace}
          placeholder="…or a town / postcode"
          placeholderTextColor={theme.textSecondary}
          onSubmitEditing={searchPlace}
          returnKeyType="search"
          style={[styles.input, { flex: 1, color: theme.text, backgroundColor: theme.backgroundElement }]}
        />
        <Button label="Search" variant="outline" onPress={searchPlace} loading={status === 'searching'} disabled={busy} />
      </View>

      {message && (
        <ThemedText type="small" themeColor="textSecondary">
          {message}
        </ThemedText>
      )}

      {results.map((d) => (
        <Pressable key={d.id} onPress={() => onPick(d)} style={[styles.dropOff, { backgroundColor: theme.backgroundElement }]}>
          <View style={{ flex: 1 }}>
            <ThemedText>{d.name}</ThemedText>
            {d.address && (
              <ThemedText type="small" themeColor="textSecondary">
                {d.address}
              </ThemedText>
            )}
            <ThemedText type="small" themeColor="textSecondary">
              {d.openingHours ? `Hours: ${d.openingHours}` : 'Opening hours not listed — check before you go'}
            </ThemedText>
          </View>
          <ThemedText type="smallBold" style={{ color: theme.tint }}>
            {d.distanceKm < 1 ? `${Math.round(d.distanceKm * 1000)} m` : `${d.distanceKm.toFixed(1)} km`}
          </ThemedText>
        </Pressable>
      ))}

      {status === 'done' && (
        <View style={styles.custom}>
          <ThemedText type="smallBold">Somewhere else?</ThemedText>
          <View style={styles.searchRow}>
            <TextInput
              value={customName}
              onChangeText={setCustomName}
              placeholder="e.g. Community pantry at St Mary's"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { flex: 1, color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
            <Button label="Use" variant="outline" onPress={() => onPick({ name: customName.trim() })} disabled={!customName.trim()} />
          </View>
        </View>
      )}
    </>
  );
}

function ConfirmStep({ dropOff, units, onConfirm }: { dropOff: DropOff | { name: string }; units: number; onConfirm: () => void }) {
  const theme = useTheme();
  const place = 'location' in dropOff ? dropOff : null;
  return (
    <>
      <View style={[styles.headline, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText style={{ textAlign: 'center' }}>Take your box of</ThemedText>
        <ThemedText type="subtitle" style={{ color: theme.tint, fontSize: 28, lineHeight: 34 }}>
          {units} item{units === 1 ? '' : 's'} · ≈ {estimateMeals(units)} meals
        </ThemedText>
        <ThemedText style={{ textAlign: 'center' }}>to {dropOff.name}</ThemedText>
        {place?.address && (
          <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
            {place.address}
          </ThemedText>
        )}
      </View>
      {place && (
        <Button
          label="Open in map"
          variant="outline"
          onPress={() =>
            Linking.openURL(`https://www.openstreetmap.org/?mlat=${place.location.lat}&mlon=${place.location.lon}#map=17/${place.location.lat}/${place.location.lon}`)
          }
        />
      )}
      <Button label="I dropped these off" onPress={onConfirm} style={styles.cta} />
      <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
        Tap this once you&apos;ve handed the food over. We trust you.
      </ThemedText>
    </>
  );
}

export default function DonateScreen() {
  const insets = useSafeAreaInsets();
  const items = useItems((s) => s.items);
  const donate = useItems((s) => s.donate);

  const [candidates] = useState(() => findDonationCandidates(items, new Date()));
  const [selected, setSelected] = useState(() => new Set(candidates.map((c) => c.item.id)));
  const [step, setStep] = useState<Step>('box');
  const [dropOff, setDropOff] = useState<DropOff | { name: string } | null>(null);

  const chosen = candidates.filter((c) => selected.has(c.item.id));
  const units = chosen.reduce((sum, c) => sum + c.suggestedQuantity, 0);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const confirm = () => {
    if (!dropOff) return;
    donate(
      chosen.map((c) => ({ id: c.item.id, quantity: c.suggestedQuantity })),
      dropOff.name,
    );
    router.back();
  };

  if (candidates.length === 0) {
    return (
      <ThemedView style={[styles.container, styles.empty]}>
        <ThemedText style={{ textAlign: 'center' }}>
          No surplus right now. When you&apos;re holding more long-life food than you&apos;ll eat, it shows up here.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled">
        {step !== 'box' && (
          <Pressable onPress={() => setStep(step === 'confirm' ? 'where' : 'box')}>
            <ThemedText type="linkPrimary">‹ Back</ThemedText>
          </Pressable>
        )}
        {step === 'box' && <BoxStep candidates={candidates} selected={selected} toggle={toggle} onNext={() => setStep('where')} />}
        {step === 'where' && (
          <WhereStep
            onPick={(d) => {
              setDropOff(d);
              setStep('confirm');
            }}
          />
        )}
        {step === 'confirm' && dropOff && <ConfirmStep dropOff={dropOff} units={units} onConfirm={confirm} />}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 10 },
  empty: { justifyContent: 'center', padding: 32 },
  headline: { borderRadius: 18, padding: 18, alignItems: 'center', gap: 6 },
  cta: { marginTop: 8 },
  searchRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  dropOff: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14 },
  custom: { gap: 8, marginTop: 8 },
});
