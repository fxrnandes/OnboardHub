alter table companies add column cnpj text check (cnpj ~ '^[0-9A-Z]{12}[0-9]{2}$');

create unique index companies_cnpj_unique on companies (cnpj);
