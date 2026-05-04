from skills.skill_auditoria_compliance import auditar


class AgenteRevisor:
    """Agente de revisão e compliance — sem chamadas à API."""

    def executar(self, html: str) -> dict:
        print("[Revisor] Auditando HTML gerado...")
        relatorio = auditar(html)
        status = "APROVADO" if relatorio["aprovado"] else "REPROVADO"
        print(f"[Revisor] {status} — {relatorio['tamanho_kb']} KB")
        if relatorio["erros"]:
            for erro in relatorio["erros"]:
                print(f"  [ERRO] {erro}")
        if relatorio["avisos"]:
            for aviso in relatorio["avisos"]:
                print(f"  [AVISO] {aviso}")
        return relatorio
