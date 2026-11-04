import 'package:flutter/material.dart';

import '../theme.dart';
import '../widgets/common.dart';

const _sections = [
  (
    'Divisão e frequência',
    'Tradicional (4 semanas): Peito e Tríceps, Costas e Bíceps, Ombros e Abdômen, Pernas, e Peito e Costas '
        'na sexta. Peito, costas e deltoide lateral treinam 2 vezes por semana e pernas 1 vez, por enquanto. '
        'Shape X Ciência (8 semanas, o próximo): cada músculo 2 vezes por semana, com pernas em dois dias. '
        'Treinar cada músculo pelo menos 2 vezes por semana facilita distribuir o volume com qualidade.'
  ),
  (
    'Volume',
    'Entre 10 e 20 séries semanais por músculo, contando séries indiretas como meia série. No Tradicional, '
        'peito e costas ficam com 18 séries diretas e quadríceps com 9. No Ciência, peito e costas ficam com 15 '
        'e quadríceps com 12. O app avisa quando um músculo passa de 20 séries, porque daí em diante o ganho '
        'extra tende a ser pequeno e a recuperação piora.'
  ),
  (
    'Proximidade da falha',
    'Compostos com 1 a 2 repetições de sobra (RIR), máquinas com cerca de 1, isoladores com 0 a 1. '
        'Chegar perto da falha é o que torna a série efetiva; ir sempre até a falha total nos compostos '
        'aumenta a fadiga sem ganho proporcional.'
  ),
  (
    'Faixas de repetição e descanso',
    'Compostos de 6 a 12 repetições com 2 a 3 minutos de descanso; isoladores de 10 a 20 com 1 a 1,5 minuto. '
        'Cargas leves e pesadas geram hipertrofia parecida quando a série chega perto da falha, e descansos '
        'mais longos nos compostos preservam o desempenho das séries seguintes.'
  ),
  (
    'Seleção de exercícios',
    'Predomínio de máquinas e polias, que permitem chegar perto da falha com segurança e geram hipertrofia '
        'semelhante aos pesos livres. Pesos livres entram onde trazem vantagem real: supino inclinado com halteres '
        '(mais amplitude) e stiff (alongamento dos posteriores). Exercícios em posição alongada foram priorizados: '
        'tríceps acima da cabeça, flexora sentada, rosca bayesiana, pullover e panturrilha com pausa embaixo.'
  ),
  (
    'Progressão dupla',
    'Mantenha a carga até completar o topo da faixa em todas as séries com boa execução. Então suba o menor '
        'incremento do equipamento e trabalhe de novo até o topo. O app calcula isso sozinho, mas só aplica a '
        'carga nova quando você toca em Aplicar.'
  ),
  (
    'Técnica simples',
    'Sem drop sets, rest-pause ou parciais. Séries tradicionais, execução controlada (descida em 2 a 3 segundos) '
        'e amplitude completa. Aquecimento: 1 a 2 séries leves no primeiro exercício de cada grupo, que não contam '
        'como séries de trabalho.'
  ),
];

const _refs = [
  'Schoenfeld, Ogborn e Krieger (2017). Dose-response relationship between weekly resistance training volume and increases in muscle mass. J Sports Sci.',
  'Pelland e colaboradores (2024). Meta-regressões sobre volume semanal e frequência na hipertrofia e na força.',
  'Schoenfeld, Ogborn e Krieger (2016). Effects of resistance training frequency on measures of muscle hypertrophy. Sports Med.',
  'Schoenfeld, Grgic e Krieger (2019). How many times per week should a muscle be trained to maximize muscle hypertrophy? J Sports Sci.',
  'Refalo e colaboradores (2023). Influence of resistance training proximity-to-failure on skeletal muscle hypertrophy. Sports Med.',
  'Robinson e colaboradores (2024). Dose-response between estimated proximity to failure, strength gain and hypertrophy. Sports Med.',
  'Schoenfeld e colaboradores (2017). Strength and hypertrophy adaptations between low- vs. high-load resistance training. J Strength Cond Res.',
  'Schoenfeld e colaboradores (2016). Longer interset rest periods enhance muscle strength and hypertrophy in resistance-trained men. J Strength Cond Res.',
  'Singer e colaboradores (2024). Give it a rest: Bayesian meta-analysis on inter-set rest interval and hypertrophy. Front Sports Act Living.',
  'Haugen e colaboradores (2023). Effect of free-weight vs. machine-based strength training on strength and hypertrophy. BMC Sports Sci Med Rehabil.',
  'Maeo e colaboradores (2021). Greater hamstrings hypertrophy after training at long versus short muscle lengths. Med Sci Sports Exerc.',
  'Maeo e colaboradores (2023). Triceps brachii hypertrophy is substantially greater after overhead elbow extension training. Eur J Sport Sci.',
  'Kubo, Ikebukuro e Yata (2019). Effects of squat training with different depths on lower limb muscle volumes. Eur J Appl Physiol.',
  'Pedrosa e colaboradores (2022). Partial range of motion training at long muscle lengths. Eur J Sport Sci.',
  'Plotkin e colaboradores (2022). Progressive overload without progressing load? Load or repetition progression. PeerJ.',
  'Kassiano e colaboradores (2022). Does varying resistance exercises promote superior muscle hypertrophy and strength gains? J Strength Cond Res.',
  'Rodríguez-Ridao e colaboradores (2020). Effect of five bench inclinations on the EMG activity of the pectoralis major. Int J Environ Res Public Health.',
];

class AboutProgramScreen extends StatelessWidget {
  const AboutProgramScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Por que este programa')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
        children: [
          const Text(
            'Objetivo: hipertrofia com prioridade para o shape em X, ou seja, peito cheio, ombros largos, '
            'costas em V, braços volumosos e pernas proporcionais.',
            style: TextStyle(color: AppColors.textDim, height: 1.45),
          ),
          const SizedBox(height: 8),
          for (final (title, text) in _sections) ...[
            SectionHeader(title),
            XCard(child: Text(text, style: const TextStyle(height: 1.5))),
          ],
          const SectionHeader('Referências'),
          XCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final r in _refs)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 5),
                    child: Text(r, style: const TextStyle(color: AppColors.textDim, fontSize: 13, height: 1.4)),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
