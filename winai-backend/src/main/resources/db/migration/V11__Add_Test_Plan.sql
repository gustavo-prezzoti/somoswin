-- Plano de teste R$1,00 para validar fluxo de pagamento e webhook
INSERT INTO winai.plans (id, name, display_name, price, setup_fee, lead_limit, user_limit, whatsapp_limit, active, description, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'TEST',
    'Plano Teste',
    1.00,
    0.00,
    10,
    1,
    1,
    true,
    'Plano de teste para validação do fluxo de pagamento - R$1,00',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (name) DO NOTHING;
