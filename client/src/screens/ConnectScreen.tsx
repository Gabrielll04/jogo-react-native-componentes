import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AVATAR_COLORS, TEAMS } from '@shared/events';
import type { TeamId } from '@shared/types';
import { connect } from '../net/socket';
import { Btn } from '../ui/Btn';
import { colors, ui } from '../ui/theme';

const PROFILE_KEY = 'rnq_profile';

function loadProfile(): { name: string; color: string; team: TeamId } {
  try {
    const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
    return { name: saved.name ?? '', color: saved.color ?? AVATAR_COLORS[5], team: saved.team ?? 'azul' };
  } catch {
    return { name: '', color: AVATAR_COLORS[5], team: 'azul' };
  }
}

export function ConnectScreen() {
  const initial = loadProfile();
  const [name, setName] = useState(initial.name);
  const [color, setColor] = useState(initial.color);
  const [team, setTeam] = useState<TeamId>(initial.team);

  const join = () => {
    const profile = { name: name.trim() || 'Aluno', color, team };
    try {
      // no app mobile isso seria AsyncStorage; no navegador usamos localStorage
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch {
      /* ignore */
    }
    connect(profile);
  };

  return (
    <View style={styles.screen}>
      <View style={[ui.panel, styles.card]}>
        <Text style={styles.logo}>⚛️</Text>
        <Text style={ui.title}>React Native Quest</Text>
        <Text style={[ui.muted, { marginBottom: 20 }]}>Component Guardians — aprenda componentes jogando</Text>

        <Text style={styles.label}>Seu nome</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          onSubmitEditing={join}
          placeholder="Ex.: Ana"
          placeholderTextColor={colors.muted}
          maxLength={16}
          autoFocus
          style={styles.input}
        />

        <Text style={styles.label}>Cor do avatar</Text>
        <View style={[ui.row, { flexWrap: 'wrap', gap: 10 }]}>
          {AVATAR_COLORS.map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              style={[styles.swatch, { backgroundColor: c }, c === color && styles.swatchOn]}
            />
          ))}
        </View>

        <Text style={styles.label}>Equipe</Text>
        <View style={[ui.row, { flexWrap: 'wrap', gap: 8 }]}>
          {TEAMS.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => setTeam(t.id)}
              style={[styles.team, { borderColor: t.color }, team === t.id && { backgroundColor: t.color }]}
            >
              <Text style={ui.btnText}>{t.name}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.preview}>
          <View style={[styles.avatar, { backgroundColor: color }]}>
            <Text style={{ fontSize: 12 }}>• •</Text>
          </View>
          <Text style={ui.text}>{name.trim() || 'Aluno'}</Text>
        </View>

        <Btn title="Entrar no lobby ▶" primary onPress={join} />
        <Text style={[ui.muted, { marginTop: 14, textAlign: 'center' }]}>
          Servidor: {window.location.host} · Controles: WASD/setas para andar, E para interagir
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: colors.bg },
  card: { width: '100%', maxWidth: 460 },
  logo: { fontSize: 44, marginBottom: 4 },
  label: { color: colors.muted, fontSize: 13, marginTop: 14, marginBottom: 6, fontWeight: '600' },
  input: {
    backgroundColor: '#0d0f16',
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: 'transparent' },
  swatchOn: { borderColor: '#fff', transform: [{ scale: 1.15 }] },
  team: { borderWidth: 2, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10 },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 18 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
