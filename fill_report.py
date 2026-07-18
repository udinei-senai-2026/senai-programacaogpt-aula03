from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import shutil

p = Path('C:/Users/Aluno/Documents/Programação ChatGPT/A03/[Sistema triagem] Resumo de versão.docx')
if not p.exists():
    raise FileNotFoundError(f'Document not found: {p}')

backup = p.with_suffix('.backup.docx')
shutil.copy2(p, backup)

with ZipFile(p, 'r') as z:
    xml = z.read('word/document.xml').decode('utf-8', errors='replace')

replacements = {
    '[Nome do Sistema]': 'Triagem PS',
    '[X.X.X]': '11.1.0.2',
    '[DD/MM/AAAA]': '18/07/2026',
    '[Descreva brevemente o objetivo principal desta liberação]': 'Corrigir a lógica de triagem e adicionar confirmação ao chamar o próximo paciente.',
    '[Breve resumo do problema encontrado]': 'Pacientes já em fila eram listados como disponíveis para triagem e o botão "Chamar próximo" chamava o paciente sem confirmação.',
    '[O que o sistema estava fazendo de errado]': 'Apresentava pacientes já na fila como candidatos à triagem e chamava o próximo paciente imediatamente, sem validação do usuário.',
    '[O que o sistema deveria fazer corretamente]': 'Omitir pacientes já na fila da seleção de triagem e solicitar confirmação antes de chamar o próximo paciente.',
    '[Módulo, tela ou componente impactado]': 'Tela de triagem e tela de fila; arquivos assets/triagem.js e assets/fila.js.',
    '[O que foi feito no código/banco para corrigir]': 'Filtragem de pacientes já na fila em renderPatientOptions() em assets/triagem.js e inclusão de confirmação em callNext() em assets/fila.js.',
    '[Resumo da melhoria proposta]': 'Prevenção de triagem duplicada e redução de chamadas indevidas, melhorando a segurança e usabilidade do fluxo de atendimento.',
    '[Como funcionava antes ou qual era a limitação]': 'Antes, pacientes em fila apareciam na seleção de triagem e chamar o próximo paciente não exigia confirmação.',
    '[O que mudou e como ficou agora]': 'Agora a seleção de triagem exclui pacientes em fila e o botão "Chamar próximo" pede confirmação antes de avançar.',
    '[Módulo ou fluxo impactado]': 'Fluxo de triagem de pacientes e fluxo de atendimento da fila.',
    '[Ganhos de performance, usabilidade, segurança, etc.]': 'Maior segurança operacional, redução de erros humanos e melhor experiência de uso na triagem e chamada da fila.'
}

for old, new in replacements.items():
    if old not in xml:
        raise ValueError(f'Placeholder not found: {old}')
    xml = xml.replace(old, new)

out_path = p.with_name('temp_version.docx')
with ZipFile(p, 'r') as z:
    with ZipFile(out_path, 'w', compression=ZIP_DEFLATED) as w:
        for item in z.infolist():
            data = z.read(item.filename)
            if item.filename == 'word/document.xml':
                w.writestr(item, xml.encode('utf-8'))
            else:
                w.writestr(item, data)

p.unlink()
out_path.rename(p)
print('Report filled. Backup created at', backup)
