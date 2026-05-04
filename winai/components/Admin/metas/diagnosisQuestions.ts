
export type QuestionType = 'single_select' | 'multi_select' | 'text_short' | 'text_long' | 'boolean' | 'number';

export function diagAnswerList(answers: Record<string, any>, key: string): string[] {
  const v = answers[key];
  if (Array.isArray(v)) {
    return v.filter((x): x is string => typeof x === 'string');
  }
  if (v != null && v !== '') {
    return [String(v)];
  }
  return [];
}

export function diagIncludesAny(answers: Record<string, any>, key: string, values: string[]): boolean {
  return diagAnswerList(answers, key).some((x) => values.includes(x));
}

export interface Question {
  id: string;
  variable: string;
  type: QuestionType;
  question: string;
  showIf?: (answers: Record<string, any>) => boolean;
  impacts?: string[];
  options?: { label: string; value: string }[];
  /** Em multi_select: número máximo de opções que podem ser marcadas. */
  multiSelectMax?: number;
}

export interface DiagnosisBlock {
  id: number;
  title: string;
  objective: string;
  questions: Question[];
}

export const DIAGNOSIS_BLOCKS: DiagnosisBlock[] = [
  {
    id: 1,
    title: 'Raio-X do Negócio',
    objective: 'Entender que empresa é essa e em que momento ela está.',
    questions: [
      {
        id: 'B1_01',
        variable: 'negocio.modelo_principal',
        type: 'multi_select',
        question:
          'Quais opções descrevem o negócio hoje? (pode marcar mais de um, ex.: B2B + B2C)',
        impacts: ['tipo_operacao', 'google_impact', 'meta_impact', 'sales_first_impact'],
        options: [
          { label: 'B2C Local', value: 'b2c_local' },
          { label: 'B2C Nacional', value: 'b2c_nacional' },
          { label: 'E-commerce', value: 'ecommerce' },
          { label: 'B2B', value: 'b2b' },
          { label: 'B2B2C', value: 'b2b2c' },
          { label: 'Serviço Premium', value: 'servico_premium' },
          { label: 'Infoproduto Digital', value: 'infoproduto_digital' },
          { label: 'Híbrido', value: 'hibrido' },
        ]
      },
      {
        id: 'B1_02',
        variable: 'negocio.segmento',
        type: 'text_short',
        question: 'Em qual segmento o negócio atua?',
        impacts: ['tipo_operacao', 'gargalo_principal']
      },
      {
        id: 'B1_03',
        variable: 'negocio.abrangencia_geografica',
        type: 'single_select',
        question: 'Onde o negócio vende hoje?',
        impacts: ['tipo_operacao', 'google_impact', 'prontidao_trafego'],
        options: [
          { label: 'Bairro/Cidade', value: 'bairro_city' },
          { label: 'Região', value: 'region' },
          { label: 'Estado', value: 'state' },
          { label: 'Brasil Inteiro', value: 'brazil' },
          { label: 'Internacional', value: 'international' },
        ]
      },
      {
        id: 'B1_04',
        variable: 'negocio.fase_atual',
        type: 'single_select',
        question: 'Em qual fase o negócio está hoje?',
        impacts: ['maturidade_oferta', 'maturidade_comercial', 'prontidao_trafego'],
        options: [
          { label: 'Validação', value: 'validacao' },
          { label: 'Estruturação', value: 'estruturacao' },
          { label: 'Crescimento', value: 'crescimento' },
          { label: 'Escala', value: 'escala' },
          { label: 'Reestruturação', value: 'reestruturacao' },
        ]
      },
      {
        id: 'B1_05',
        variable: 'negocio.objetivo_90_dias',
        type: 'multi_select',
        question: 'Quais são os principais objetivos dos próximos 90 dias?',
        impacts: ['canal_prioritario', 'gargalo_principal'],
        options: [
          { label: 'Gerar mais leads', value: 'gerar_mais_leads' },
          { label: 'Fechar mais vendas', value: 'fechar_mais_vendas' },
          { label: 'Organizar comercial', value: 'organizar_comercial' },
          { label: 'Melhorar ROI', value: 'melhorar_roi' },
          { label: 'Escalar', value: 'escalar' },
          { label: 'Aumentar LTV', value: 'aumentar_ltv' },
          { label: 'Lançar digital', value: 'lancar_digital' },
        ]
      },
      {
        id: 'B1_06',
        variable: 'negocio.gargalo_percebido',
        type: 'multi_select',
        question: 'Onde estão os maiores travamentos hoje? (pode marcar mais de um)',
        impacts: ['gargalo_principal', 'setup_foundation_impact'],
        options: [
          { label: 'Oferta', value: 'oferta' },
          { label: 'Posicionamento', value: 'posicionamento' },
          { label: 'Geração de leads', value: 'geracao_de_leads' },
          { label: 'Qualidade de leads', value: 'qualidade_leads' },
          { label: 'Conversão comercial', value: 'conversao_comercial' },
          { label: 'Atendimento', value: 'atendimento' },
          { label: 'Rastreamento', value: 'rastreamento' },
          { label: 'Pós-venda', value: 'pos_venda' },
          { label: 'Falta de processo', value: 'falta_processo' },
        ]
      },
      {
        id: 'B1_07',
        variable: 'negocio.venda_envolve_varios_decisores',
        type: 'boolean',
        question: 'A venda envolve mais de um decisor?',
        showIf: (answers) => diagIncludesAny(answers, 'negocio.modelo_principal', ['b2b', 'b2b2c']),
        impacts: ['complexidade_comercial', 'sales_first_impact']
      },
      {
        id: 'B1_08',
        variable: 'negocio.ciclo_venda_medio_dias',
        type: 'number',
        question: 'Qual é o ciclo médio de venda em dias?',
        showIf: (answers) =>
          diagIncludesAny(answers, 'negocio.modelo_principal', ['b2b', 'b2b2c', 'servico_premium']),
        impacts: ['complexidade_comercial', 'sales_first_impact']
      },
      {
        id: 'B1_09',
        variable: 'negocio.ticket_medio_b2b',
        type: 'single_select',
        question: 'Qual é o ticket médio das vendas B2B?',
        showIf: (answers) => diagIncludesAny(answers, 'negocio.modelo_principal', ['b2b', 'b2b2c']),
        impacts: ['complexidade_comercial', 'sales_first_impact'],
        options: [
          { label: 'Até R$ 2.000', value: 'ate_2000' },
          { label: 'R$ 2.001 - R$ 10.000', value: '2001_10000' },
          { label: 'Acima de R$ 10.000', value: 'acima_10000' },
        ]
      },
      {
        id: 'B1_10',
        variable: 'negocio.tem_unidade_fisica',
        type: 'boolean',
        question: 'O negócio tem unidade física?',
        showIf: (answers) => diagIncludesAny(answers, 'negocio.modelo_principal', ['b2c_local']),
        impacts: ['tipo_operacao', 'google_impact']
      },
      {
        id: 'B1_11',
        variable: 'negocio.raio_atendimento_km',
        type: 'number',
        question: 'Qual é o raio de atendimento em km?',
        showIf: (answers) => diagIncludesAny(answers, 'negocio.modelo_principal', ['b2c_local']),
        impacts: ['google_impact', 'canal_prioritario']
      },
      {
        id: 'B1_12',
        variable: 'negocio.google_meu_negocio_status',
        type: 'single_select',
        question: 'O Google Meu Negócio está ativo?',
        showIf: (answers) => diagIncludesAny(answers, 'negocio.modelo_principal', ['b2c_local']),
        impacts: ['google_impact', 'setup_foundation_impact'],
        options: [
          { label: 'Não tem', value: 'nao_tem' },
          { label: 'Tem, sem gestão', value: 'tem_sem_gestao' },
          { label: 'Tem, ativo', value: 'tem_ativo' },
        ]
      },
      {
        id: 'B1_13',
        variable: 'negocio.descricao_geral',
        type: 'text_long',
        question: 'Descreva, de forma simples, o que a empresa vende hoje.',
        impacts: ['tipo_operacao', 'maturidade_oferta']
      },
      {
        id: 'B1_14',
        variable: 'negocio.como_funciona_hoje',
        type: 'text_long',
        question: 'Explique como o negócio funciona hoje na prática.',
        impacts: ['tipo_operacao', 'gargalo_principal']
      },
      {
        id: 'B1_15',
        variable: 'negocio.problema_crescimento_aberto',
        type: 'text_long',
        question: 'Qual é o principal problema que trava o crescimento atualmente?',
        impacts: ['gargalo_principal']
      }
    ]
  },
  {
    id: 2,
    title: 'Oferta, Economia e Prioridade de Escala',
    objective: 'Entender o que vende, como vende e o que mais vale priorizar.',
    questions: [
      {
        id: 'B2_01',
        variable: 'oferta.tipo_venda',
        type: 'single_select',
        question: 'Hoje vocês vendem principalmente o quê?',
        impacts: ['tipo_operacao', 'maturidade_oferta'],
        options: [
          { label: 'Produto Físico', value: 'produto_fisico' },
          { label: 'Serviço', value: 'servico' },
          { label: 'Assinatura', value: 'assinatura' },
          { label: 'Infoproduto', value: 'infoproduto' },
          { label: 'Produto + Serviço', value: 'produto_servico' },
          { label: 'Mix', value: 'mix' },
        ]
      },
      {
        id: 'B2_02',
        variable: 'oferta.qtd_ofertas_ativas',
        type: 'single_select',
        question: 'Quantas ofertas ativas existem hoje?',
        impacts: ['maturidade_oferta', 'gargalo_principal'],
        options: [
          { label: '1', value: '1' },
          { label: '2 - 3', value: '2_3' },
          { label: '4 - 7', value: '4_7' },
          { label: '8 ou mais', value: '8_mais' },
        ]
      },
      {
        id: 'B2_03',
        variable: 'oferta.oferta_principal',
        type: 'text_short',
        question: 'Qual é a principal oferta hoje?',
        impacts: ['maturidade_oferta', 'gargalo_principal']
      },
      {
        id: 'B2_04',
        variable: 'oferta.ticket_medio',
        type: 'single_select',
        question: 'Qual é o ticket médio da principal oferta?',
        impacts: ['complexidade_comercial', 'sales_first_impact'],
        options: [
          { label: 'Até R$ 100', value: 'ate_100' },
          { label: 'R$ 101 - R$ 500', value: '101_500' },
          { label: 'R$ 501 - R$ 2.000', value: '501_2000' },
          { label: 'R$ 2.001 - R$ 10.000', value: '2001_10000' },
          { label: 'R$ 10.001 - R$ 30.000', value: '10001_30000' },
          { label: 'R$ 30.001 - R$ 100.000', value: '30001_100000' },
          { label: 'R$ 100.001 - R$ 500.000', value: '100001_500000' },
          { label: 'Acima de R$ 500.000', value: 'acima_500000' },
        ]
      },
      {
        id: 'B2_05',
        variable: 'oferta.margem_percebida',
        type: 'single_select',
        question:
          'Qual a faixa da margem de contribuição da principal oferta? (% sobre a receita, após custos variáveis diretos)',
        impacts: ['maturidade_oferta', 'gargalo_principal'],
        options: [
          { label: 'Menos de 15%', value: 'mc_ate_15pct' },
          { label: '15% a 20%', value: 'mc_15_20pct' },
          { label: '20% a 30%', value: 'mc_20_30pct' },
          { label: '30% a 40%', value: 'mc_30_40pct' },
          { label: '40% a 60%', value: 'mc_40_60pct' },
          { label: '60% ou mais', value: 'mc_60_mais' },
          { label: 'Não sei', value: 'nao_sei' },
        ]
      },
      {
        id: 'B2_05A',
        variable: 'oferta.modelo_receita_principal',
        type: 'single_select',
        question: 'A principal oferta é recorrente, pagamento único ou híbrida?',
        impacts: ['potencial_ltv', 'maturidade_oferta', 'gargalo_principal'],
        options: [
          { label: 'Recorrente (assinatura, mensalidade, renovação)', value: 'recorrente' },
          { label: 'Pagamento único', value: 'pagamento_unico' },
          { label: 'Híbrido (ex.: entrada + recorrência ou upsell)', value: 'hibrido' },
        ]
      },
      {
        id: 'B2_05B',
        variable: 'oferta.tempo_retorno_compra',
        type: 'single_select',
        question: 'Em quanto tempo, em média, o cliente costuma voltar a comprar? (LTV / recompra)',
        impacts: ['potencial_ltv', 'retention_impact', 'gargalo_principal'],
        options: [
          { label: 'Sem recompra típica (compra pontual)', value: 'sem_recompra_tipica' },
          { label: 'Até 30 dias', value: 'ate_30_dias' },
          { label: '1 a 3 meses', value: '1_3_meses' },
          { label: '3 a 6 meses', value: '3_6_meses' },
          { label: '6 a 12 meses', value: '6_12_meses' },
          { label: 'Mais de 12 meses', value: 'acima_12_meses' },
          { label: 'Varia muito / não sei', value: 'varia_nao_sei' },
        ]
      },
      {
        id: 'B2_06',
        variable: 'oferta.oferta_ja_validada',
        type: 'single_select',
        question: 'A principal oferta já está validada?',
        impacts: ['maturidade_oferta', 'prontidao_trafego', 'gargalo_principal'],
        options: [
          { label: 'Vende com frequência', value: 'vende_com_frequencia' },
          { label: 'Vende, sem previsibilidade', value: 'vende_sem_previsibilidade' },
          { label: 'Sendo testada', value: 'sendo_testada' },
          { label: 'Sem clareza', value: 'sem_clareza' },
        ]
      },
      {
        id: 'B2_07',
        variable: 'oferta.escada_valor_existe',
        type: 'boolean',
        question: 'Existe escada de valor (produto de entrada, principal e premium)?',
        impacts: ['potencial_ltv', 'maturidade_oferta']
      },
      {
        id: 'B2_08',
        variable: 'oferta.curva_abc_existe',
        type: 'boolean',
        question: 'Existe curva ABC ou clareza do que mais vende e mais lucra?',
        impacts: ['maturidade_oferta', 'gargalo_principal']
      },
      {
        id: 'B2_09',
        variable: 'oferta.produto_mais_vende',
        type: 'text_short',
        question: 'Qual produto mais vende?',
        showIf: (answers) => answers['oferta.qtd_ofertas_ativas'] !== '1',
        impacts: ['maturidade_oferta', 'gargalo_principal']
      },
      {
        id: 'B2_13',
        variable: 'oferta.depende_diagnostico',
        type: 'boolean',
        question: 'A venda depende de diagnóstico?',
        showIf: (answers) => ['servico', 'produto_servico'].includes(answers['oferta.tipo_venda']),
        impacts: ['complexidade_comercial', 'sales_first_impact']
      }
    ]
  },
  {
    id: 3,
    title: 'ICP, Demanda e Comportamento de Compra',
    objective: 'Entender quem compra, por que e se a compra é por desejo ou necessidade.',
    questions: [
      {
        id: 'B3_01',
        variable: 'demanda.tipo',
        type: 'single_select',
        question: 'A compra da principal oferta é mais de necessidade, desejo ou híbrida?',
        impacts: ['tipo_demanda', 'google_impact', 'meta_impact'],
        options: [
          { label: 'Necessidade', value: 'necessidade' },
          { label: 'Desejo', value: 'desejo' },
          { label: 'Híbrida', value: 'hibrida' },
        ]
      },
      {
        id: 'B3_02',
        variable: 'demanda.consciencia_publico',
        type: 'single_select',
        question: 'O cliente já entende que precisa da solução?',
        impacts: ['tipo_demanda', 'meta_impact', 'google_impact'],
        options: [
          { label: 'Sim, procura ativamente', value: 'sim_procura_ativamente' },
          { label: 'Entende o problema', value: 'entende_problema' },
          { label: 'Precisa ser educado', value: 'precisa_ser_educado' },
        ]
      },
      {
        id: 'B3_03',
        variable: 'demanda.icp_descricao',
        type: 'text_long',
        question: 'Quem é o cliente ideal hoje?',
        impacts: ['tipo_operacao', 'maturidade_oferta']
      },
      {
        id: 'B3_06',
        variable: 'demanda.principal_objecao',
        type: 'multi_select',
        question: 'Quais objeções aparecem com mais frequência?',
        impacts: ['gargalo_principal', 'maturidade_oferta', 'maturidade_comercial'],
        options: [
          { label: 'Preço', value: 'preco' },
          { label: 'Tempo', value: 'tempo' },
          { label: 'Confiança', value: 'confianca' },
          { label: 'Não é prioridade', value: 'nao_e_prioridade' },
          { label: 'Preciso pensar', value: 'preciso_pensar' },
          { label: 'Falar com alguém', value: 'falar_com_alguem' },
          { label: 'Já tentei', value: 'ja_tentei' },
          { label: 'Não entendi a oferta', value: 'nao_entendi_oferta' },
        ]
      },
      {
        id: 'B3_08',
        variable: 'demanda.busca_google_existe',
        type: 'boolean',
        question: 'O cliente pesquisa essa solução no Google?',
        showIf: (answers) => ['necessidade', 'hibrida'].includes(answers['demanda.tipo']),
        impacts: ['google_impact', 'tipo_demanda']
      },
      {
        id: 'B3_10',
        variable: 'demanda.urgencia_compra',
        type: 'single_select',
        question: 'A compra costuma ter urgência?',
        showIf: (answers) => ['necessidade', 'hibrida'].includes(answers['demanda.tipo']),
        impacts: ['google_score', 'tipo_demanda'],
        options: [
          { label: 'Baixa', value: 'baixa' },
          { label: 'Média', value: 'media' },
          { label: 'Alta', value: 'alta' },
        ]
      }
    ]
  },
  {
    id: 4,
    title: 'Aquisição e Tráfego Pago',
    objective: 'Mapear como o cliente gera demanda hoje e onde estão as oportunidades.',
    questions: [
      {
        id: 'B4_01',
        variable: 'aquisicao.canais_atuais',
        type: 'multi_select',
        question: 'De onde vêm os leads hoje?',
        impacts: ['canal_prioritario', 'prontidao_trafego'],
        options: [
          { label: 'Google Ads', value: 'google_ads' },
          { label: 'Meta Ads', value: 'meta_ads' },
          { label: 'Indicação', value: 'indicacao' },
          { label: 'Orgânico', value: 'organico' },
          { label: 'Prospecção Ativa', value: 'prospeccao_ativa' },
          { label: 'Marketplace', value: 'marketplace' },
          { label: 'Parceiros', value: 'parceiros' },
          { label: 'Base Antiga', value: 'base_antiga' },
          { label: 'Sem consistência', value: 'sem_consistencia' },
        ]
      },
      {
        id: 'B4_02',
        variable: 'aquisicao.trafego_pago_ja_rodou',
        type: 'single_select',
        question: 'Já rodaram tráfego pago antes?',
        impacts: ['prontidao_trafego', 'gargalo_principal'],
        options: [
          { label: 'Sim, roda hoje', value: 'sim_roda_hoje' },
          { label: 'Sim, já rodou e parou', value: 'sim_ja_rodou_e_parou' },
          { label: 'Nunca rodou', value: 'nunca_rodou' },
        ]
      },
      {
        id: 'B4_03',
        variable: 'aquisicao.orcamento_mensal',
        type: 'single_select',
        question: 'Qual é a verba mensal disponível para mídia?',
        impacts: ['prontidao_trafego', 'canal_prioritario'],
        options: [
          { label: 'Até R$ 1.000', value: 'ate_1000' },
          { label: 'R$ 1.001 - R$ 3.000', value: '1001_3000' },
          { label: 'R$ 3.001 - R$ 10.000', value: '3001_10000' },
          { label: 'R$ 10.001 - R$ 30.000', value: '10001_30000' },
          { label: 'Acima de R$ 30.000', value: 'acima_30000' },
          { label: 'Não definido', value: 'nao_definido' },
        ]
      },
      {
        id: 'B4_05',
        variable: 'aquisicao.ativos_atuais',
        type: 'multi_select',
        question: 'Quais ativos já existem hoje?',
        impacts: ['prontidao_trafego', 'setup_foundation_impact'],
        options: [
          { label: 'Página de vendas', value: 'pagina_vendas' },
          { label: 'WhatsApp Business', value: 'whatsapp_business' },
          { label: 'CRM', value: 'crm' },
          { label: 'Pixel/Tag', value: 'pixel_tag' },
          { label: 'Base Remarketing', value: 'base_remarketing' },
          { label: 'Criativos Prontos', value: 'criativos_prontos' },
          { label: 'Nada estruturado', value: 'nada_estruturado' },
        ]
      }
    ]
  },
  {
    id: 5,
    title: 'Vendas, CRM e IA Pre-vendedora',
    objective: 'Entender como o lead vira venda e configurar a IA pre-vendedora.',
    questions: [
      {
        id: 'B5_01',
        variable: 'vendas.modelo_fechamento',
        type: 'single_select',
        question: 'Como a venda fecha hoje?',
        impacts: ['complexidade_comercial', 'sales_first_impact'],
        options: [
          { label: 'Checkout Direto', value: 'checkout_direto' },
          { label: 'WhatsApp', value: 'whatsapp' },
          { label: 'Ligação', value: 'ligacao' },
          { label: 'Reunião/Call', value: 'reuniao_call' },
          { label: 'Loja Física', value: 'loja_fisica' },
          { label: 'Time Híbrido', value: 'time_hibrido' },
        ]
      },
      {
        id: 'B5_03',
        variable: 'vendas.crm_status',
        type: 'single_select',
        question: 'Como os leads são controlados hoje?',
        impacts: ['maturidade_comercial', 'setup_foundation_impact', 'gargalo_principal'],
        options: [
          { label: 'CRM bem usado', value: 'crm_bem_usado' },
          { label: 'CRM pouco usado', value: 'crm_pouco_usado' },
          { label: 'Planilha', value: 'planilha' },
          { label: 'WhatsApp', value: 'whatsapp' },
          { label: 'Não existe controle', value: 'nao_existe_controle' },
        ]
      },
      {
        id: 'B5_08',
        variable: 'ia_pre_vendas.ativar',
        type: 'boolean',
        question: 'A IA deve fazer a primeira qualificação antes do humano?',
        impacts: ['maturidade_comercial', 'gargalo_principal']
      }
    ]
  },
  {
    id: 6,
    title: 'Dados, Tracking e Integrações',
    objective: 'Saber se existe estrutura mínima para medir, otimizar e escalar.',
    questions: [
      {
        id: 'B6_01',
        variable: 'dados.site_status',
        type: 'single_select',
        question:
          'O negócio tem hoje site institucional, apenas página de vendas, página de vendas e site institucional, ou nenhum?',
        impacts: ['prontidao_trafego', 'setup_foundation_score'],
        options: [
          { label: 'Site institucional', value: 'site_completo' },
          { label: 'Página de vendas', value: 'landing_page' },
          { label: 'Página de vendas e site institucional', value: 'ambos' },
          { label: 'Nenhum', value: 'nenhum' },
        ]
      },
      {
        id: 'B6_02',
        variable: 'dados.tracking_status',
        type: 'multi_select',
        question: 'O que já está configurado em tracking?',
        impacts: ['maturidade_tracking', 'setup_foundation_impact'],
        options: [
          { label: 'GA4', value: 'ga4' },
          { label: 'GTM', value: 'gtm' },
          { label: 'Google Ads Tracking', value: 'google_ads_tracking' },
          { label: 'Enhanced Conversions', value: 'enhanced_conversions' },
          { label: 'Meta Pixel', value: 'meta_pixel' },
          { label: 'Meta CAPI', value: 'meta_capi' },
          { label: 'Eventos Offline', value: 'eventos_offline' },
          { label: 'Não sei', value: 'nao_sei' },
          { label: 'Nada', value: 'nada' },
        ]
      },
      {
        id: 'B6_05',
        variable: 'dados.relatorio_existe',
        type: 'boolean',
        question: 'Existe dashboard ou relatório recorrente?',
        impacts: ['maturidade_tracking']
      }
    ]
  },
  {
    id: 7,
    title: 'Pós-venda, Retenção e LTV',
    objective: 'Entender se o crescimento vem só da aquisição ou também da base.',
    questions: [
      {
        id: 'B7_01',
        variable: 'pos_venda.recompra_existe',
        type: 'single_select',
        question: 'O cliente costuma comprar mais de uma vez?',
        impacts: ['potencial_ltv', 'retention_impact'],
        options: [
          { label: 'Sim, com frequência', value: 'sim_com_frequencia' },
          { label: 'Às vezes', value: 'as_vezes' },
          { label: 'Raramente', value: 'raramente' },
          { label: 'Não', value: 'nao' },
        ]
      },
      {
        id: 'B7_02',
        variable: 'pos_venda.recorrencia_existe',
        type: 'boolean',
        question: 'Existe receita recorrente, renovação ou assinatura?',
        impacts: ['potencial_ltv', 'retention_impact']
      },
      {
        id: 'B7_04',
        variable: 'pos_venda.base_antiga_reativavel',
        type: 'boolean',
        question: 'Existe base antiga que pode ser reativada?',
        impacts: ['potencial_ltv', 'retention_impact']
      }
    ]
  },
  {
    id: 8,
    title: 'Meta, Restrições e Priorização',
    objective: 'Ajudar a IA a decidir sequência, intensidade e foco.',
    questions: [
      {
        id: 'B8_01',
        variable: 'prioridade.kpi_principal',
        type: 'multi_select',
        question: 'Quais KPIs mais importam nos próximos 90 dias?',
        multiSelectMax: 4,
        impacts: ['canal_prioritario', 'gargalo_principal'],
        options: [
          { label: 'Leads', value: 'leads' },
          { label: 'Leads Qualificados', value: 'leads_qualificados' },
          { label: 'Reuniões', value: 'reunioes' },
          { label: 'Vendas', value: 'vendas' },
          { label: 'ROAS', value: 'roas' },
          { label: 'CAC', value: 'cac' },
          { label: 'LTV', value: 'ltv' },
          { label: 'Receita', value: 'receita' },
        ]
      },
      {
        id: 'B8_06',
        variable: 'prioridade.capacidade_execucao_cliente',
        type: 'single_select',
        question: 'Quanto o cliente consegue executar internamente por semana?',
        impacts: ['prontidao_trafego', 'setup_foundation_impact'],
        options: [
          { label: 'Quase nada', value: 'quase_nada' },
          { label: 'Baixo', value: 'baixo' },
          { label: 'Médio', value: 'medio' },
          { label: 'Alto', value: 'alto' },
        ]
      }
    ]
  }
];

