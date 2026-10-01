import { Text, View } from 'react-native';
import { RULES } from '@shared/events';
import { actions } from '../net/socket';
import { useStore } from '../state/store';
import { Btn } from './Btn';
import { Overlay } from './Overlay';
import { colors, ui } from './theme';

/**
 * Cooperação: lista colegas travados. Só quem já concluiu o mesmo desafio
 * pode enviar dica (custa moedas). A dica é pré-escrita pelo professor e
 * nunca entrega a resposta. Se o colega acertar, os dois ganham pontos.
 */
export function HelpPanel({ onClose }: { onClose: () => void }) {
  const requests = useStore((s) => s.helpRequests);
  const coins = useStore((s) => s.progress?.coins ?? 0);
  return (
    <Overlay title="🆘 Colegas pedindo ajuda" onClose={onClose} maxWidth={620}>
      <Text style={[ui.muted, { marginBottom: 12 }]}>
        Enviar uma dica custa {RULES.SEND_HINT_COST} 🪙 (você tem {coins}). Se o colega acertar depois da dica, você ganha +10 XP e +2 de
        cooperação. Só dá para ajudar em desafios que você já concluiu — e chefes são sempre individuais.
      </Text>
      {requests.length === 0 ? <Text style={ui.text}>Ninguém travado agora. 🎉</Text> : null}
      {requests.map((r) => (
        <View key={r.playerId} style={[ui.row, { gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line }]}>
          <Text style={{ fontSize: 20 }}>❓</Text>
          <View style={{ flex: 1 }}>
            <Text style={[ui.text, { fontWeight: '700' }]}>{r.name}</Text>
            <Text style={ui.muted}>{r.stationTitle}</Text>
          </View>
          <Btn
            small
            primary={r.canHelp}
            disabled={!r.canHelp || coins < RULES.SEND_HINT_COST}
            title={r.canHelp ? `💡 Enviar dica (${RULES.SEND_HINT_COST}🪙)` : 'Conclua este desafio para ajudar'}
            onPress={() => actions.sendHint(r.playerId)}
          />
        </View>
      ))}
    </Overlay>
  );
}
