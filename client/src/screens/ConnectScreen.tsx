import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AVATAR_COLORS, TEAMS } from '@shared/events';
import type { TeamId } from '@shared/types';
import { connect } from '../net/socket';
import { useStore } from '../state/store';
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

interface SavedProfile {
  found: boolean;
  name?: string;
  level?: number;
  xp?: number;
  color?: string;
  team?: TeamId;
  banned?: boolean;
  online?: boolean;
}

export function ConnectScreen() {
  const [initial] = useState(loadProfile);
  const [name, setName] = useState(initial.name);
  const [color, setColor] = useState(initial.color);
  const [team, setTeam] = useState<TeamId>(initial.team);
  const [saved, setSaved] = useState<SavedProfile | null>(null);
  const loginError = useStore((s) => s.loginError);

  // procura o nome no save do servidor: quem já jogou entra direto no próprio perfil
  useEffect(() => {
    const typed = name.trim();
    if (typed.length < 2) {
      setSaved(null);
      return;
    }
    let alive = true;
    const t = setTimeout(() => {
      fetch(`/profile?name=${encodeURIComponent(typed)}`)
        .then((r) => r.json())
        .then((p: SavedProfile) => {
          if (!alive) return;
          setSaved(p);
          // ao reencontrar o perfil, recupera a cor e a equipe salvas (dá para trocar)
          if (p.found && p.color && p.team) {
            setColor(p.color);
            setTeam(p.team);
          }
        })
        .catch(() => alive && setSaved(null));
    }, 300);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [name]);

  const join = () => {
    if (name.trim().length < 2) return;
    const profile = { name: name.trim(), color, team };
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
          placeholder="Ex.: Ana Souza"
          placeholderTextColor={colors.muted}
          maxLength={16}
          autoFocus
          style={styles.input}
        />
        {loginError ? <Text style={[styles.status, styles.error]}>{loginError}</Text> : null}
        {saved?.found ? (
          saved.banned ? (
            <Text style={[styles.status, styles.error]}>🚫 Este aluno está bloqueado pelo professor.</Text>
          ) : (
            <View style={[styles.status, styles.welcome]}>
              <Text style={styles.welcomeTitle}>👋 Bem-vindo(a) de volta, {saved.name}!</Text>
              <Text style={styles.welcomeText}>
                Nível {saved.level} · {saved.xp} XP
              </Text>
              {saved.online ? <Text style={[styles.welcomeText, { color: colors.warn }]}>⚠️ Esse nome está jogando agora em outra aba/computador.</Text> : null}
            </View>
          )
        ) : name.trim().length >= 2 && saved ? (
          <Text style={[styles.status, { color: colors.muted }]}>Primeira vez por aqui? Use sempre o mesmo nome para continuar seu progresso.</Text>
        ) : null}

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

        <Btn title={saved?.found && !saved.banned ? `Continuar como ${saved.name} ▶` : 'Entrar no lobby ▶'} primary disabled={name.trim().length < 2} onPress={join} />
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
  status: { marginTop: 8, borderRadius: 10, padding: 10, fontSize: 13 },
  error: { color: '#ffb4b4', backgroundColor: '#3a1418', fontWeight: '700' },
  welcome: { backgroundColor: '#123524', borderWidth: 1, borderColor: colors.ok, gap: 4 },
  welcomeTitle: { color: '#c8ffd6', fontWeight: '800', fontSize: 15 },
  welcomeText: { color: '#a5d6b4', fontSize: 13 },
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
