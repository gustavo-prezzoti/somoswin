-- Atualiza preço do Plano Teste para R$5,00 (mínimo Asaas)
UPDATE winai.plans SET price = 5.00, description = 'Plano de teste para validação do fluxo de pagamento - R$5,00' WHERE name = 'TEST';
