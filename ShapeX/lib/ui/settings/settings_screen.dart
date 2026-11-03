import 'package:flutter/material.dart';

import '../../state/app_state.dart';
import '../theme.dart';
import '../widgets/common.dart';
import 'about_program_screen.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Ajustes')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
        children: [
          const SectionHeader('Treino'),
          XCard(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Column(
              children: [
                SwitchListTile(
                  title: const Text('Manter a tela ligada', style: TextStyle(fontWeight: FontWeight.w700)),
                  subtitle: const Text('Durante o treino, para o cronômetro ficar visível.',
                      style: TextStyle(color: AppColors.textDim)),
                  value: app.keepAwake,
                  onChanged: app.setKeepAwake,
                ),
                SwitchListTile(
                  title: const Text('Vibrar no fim do descanso', style: TextStyle(fontWeight: FontWeight.w700)),
                  value: app.vibrate,
                  onChanged: app.setVibrate,
                ),
              ],
            ),
          ),
          const SectionHeader('Programa'),
          XCard(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.science_outlined, color: AppColors.accent),
                  title: const Text('Por que este programa', style: TextStyle(fontWeight: FontWeight.w700)),
                  trailing: const Icon(Icons.chevron_right_rounded, color: AppColors.textMute),
                  onTap: () => Navigator.of(context)
                      .push(MaterialPageRoute(builder: (_) => const AboutProgramScreen())),
                ),
                ListTile(
                  leading: const Icon(Icons.restart_alt_rounded),
                  title: const Text('Restaurar programa original', style: TextStyle(fontWeight: FontWeight.w700)),
                  subtitle: const Text('Volta os 5 treinos ao padrão. O histórico não é apagado.',
                      style: TextStyle(color: AppColors.textDim)),
                  onTap: () async {
                    final ok = await confirm(context, 'Restaurar programa?',
                        'Suas edições nos treinos serão substituídas pelo programa original. Sessões e recordes continuam salvos.',
                        ok: 'Restaurar');
                    if (!ok) return;
                    await app.repo.restoreDefaultProgram();
                    app.changed();
                    if (context.mounted) toast(context, 'Programa restaurado');
                  },
                ),
              ],
            ),
          ),
          const SectionHeader('Dados'),
          XCard(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Column(
              children: [
                const ListTile(
                  leading: Icon(Icons.wifi_off_rounded, color: AppColors.accent),
                  title: Text('100% offline', style: TextStyle(fontWeight: FontWeight.w700)),
                  subtitle: Text(
                      'Tudo fica salvo só neste aparelho, em banco SQLite. Sem conta, sem login e sem internet. O app nem pede permissão de acesso à rede.',
                      style: TextStyle(color: AppColors.textDim)),
                ),
                ListTile(
                  leading: const Icon(Icons.delete_forever_outlined, color: AppColors.danger),
                  title: const Text('Apagar todos os dados',
                      style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.danger)),
                  onTap: () async {
                    final ok = await confirm(context, 'Apagar tudo?',
                        'Sessões, recordes, peso corporal e edições serão apagados. Isso não pode ser desfeito.',
                        ok: 'Apagar tudo', danger: true);
                    if (!ok) return;
                    app.workout?.stop();
                    app.workout = null;
                    await app.repo.resetAll();
                    await app.refreshExercises();
                    if (context.mounted) toast(context, 'Dados apagados');
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          const Center(
            child: Text('Shape X 1.0.0', style: TextStyle(color: AppColors.textMute, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }
}
