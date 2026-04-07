import type { Content, FaqItem } from '@/content/schema';

export const DEFAULT_FAQ_TITLE_PREFIX = 'Perguntas';
export const DEFAULT_FAQ_TITLE_HIGHLIGHT = 'frequentes';
export const DEFAULT_FAQ_SUBTITLE = 'Tudo o que você precisa saber sobre energia solar';

export const DEFAULT_FAQ_ITEMS: FaqItem[] = [
  {
    question: 'Placas de energia solar: vale a pena investir neste tipo de equipamento?',
    answer:
      'Sim. Em pouco tempo o seu sistema fotovoltaico passa a produzir praticamente a mesma quantidade de energia que você utiliza, fazendo com que a sua conta de luz fique reduzida ao valor mínimo cobrado pela concessionária, conforme o sistema de fornecimento de energia da região.\n\nAlém da vantagem financeira, é uma escolha socialmente responsável: a energia solar é limpa, sustentável e não emite nenhum tipo de poluente.\n\nNo longo prazo, o investimento oferece um ótimo retorno, pois as placas solares são extremamente duráveis, mantendo sua eficiência por cerca de 25 anos, sem necessidade de reposição, o que garante um excelente custo-benefício.',
  },
  {
    question: 'Em dias sem sol forte ou nublados as placas solares continuam produzindo energia?',
    answer:
      'Sim. Mesmo em dias nublados o sistema de energia solar continua produzindo energia, pois utiliza os raios solares que atravessam as nuvens.\n\nIsso é diferente dos dias de chuva intensa, em que a geração de energia é muito baixa, quase não produz.',
  },
  {
    question: 'A energia solar funciona em dias chuvosos ou à noite?',
    answer:
      'Não. Durante a noite ou em dias chuvosos o sistema fica desligado e não gera energia.\n\nNesses períodos, você passa a consumir a energia que foi gerada a mais nos dias ensolarados e que ficou armazenada na rede da concessionária em forma de créditos de energia (exceto nos sistemas off-grid, que utilizam baterias para suprir a demanda nesses momentos).',
  },
  {
    question: 'Quando a produção de energia for maior que o consumo, como posso usar esse excedente?',
    answer:
      'Quando a sua usina fotovoltaica produz mais energia do que você consome, esse excedente é convertido em créditos de energia junto à concessionária.\n\nDe acordo com a Lei 14.300/2022, que regulamenta o sistema de compensação de energia, o titular da unidade consumidora pode repassar esses créditos para outras unidades consumidoras, desde que estejam:\n\nNo nome do mesmo titular; e\n\nDentro da mesma concessionária de energia.\n\nAssim, você pode distribuir percentuais desses créditos para outras unidades desejadas, reduzindo também as contas de energia desses locais.',
  },
  {
    question: 'As placas solares precisam de manutenção?',
    answer:
      'Os painéis solares fotovoltaicos exigem pouca manutenção, sendo ideais para quem prefere sistemas com baixa intervenção.\n\nA recomendação é realizar uma manutenção periódica, incluindo a limpeza das placas solares, cerca de duas vezes ao ano – principalmente em regiões com poucas chuvas, muita poeira ou fuligem, fatores que podem prejudicar a eficiência na captação dos raios solares.',
  },
  {
    question: 'Posso instalar um sistema solar no meu apartamento?',
    answer:
      'Na maioria dos casos, apenas em situações específicas:\n\nSe você for o proprietário da cobertura; ou\n\nSe o condomínio disponibilizar uma área comum ampla no topo do prédio para instalar os módulos de uso coletivo.\n\nInstalações em fachada de prédio são usadas apenas em projetos arquitetônicos específicos e costumam ter custo elevado, além de dependerem das regras do condomínio (não é permitido alterar a fachada sem autorização).\n\nPara apartamentos tipo (que não sejam cobertura), em áreas urbanas, a instalação de um sistema fotovoltaico próprio não é viável na prática.',
  },
  {
    question: 'Existe algum risco ao instalar o sistema em meu imóvel?',
    answer:
      'Os riscos são equivalentes aos de qualquer intervenção bem-feita na instalação elétrica da edificação.\n\nSe o serviço for executado por profissionais capacitados e experientes, utilizando ferramentas adequadas e equipamentos de segurança, o risco de choque elétrico ou curto-circuito é praticamente nulo.',
  },
  {
    question: 'Após a instalação, posso conectar qualquer equipamento à energia?',
    answer:
      'Sim. Em um sistema fotovoltaico conectado à rede (on-grid), a energia gerada segue os mesmos parâmetros de tensão e frequência da rede elétrica da concessionária.\n\nIsso significa que ela é totalmente compatível com os equipamentos e eletrodomésticos já utilizados no imóvel, sem necessidade de adaptação específica.',
  },
];

export function getResolvedFaqItems(content: Content): FaqItem[] {
  const items = content.faq?.items;
  if (items && items.length > 0) {
    return items as FaqItem[];
  }
  return DEFAULT_FAQ_ITEMS;
}
