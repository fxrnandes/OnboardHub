import { useState } from 'react';
import { companyApi, type CompanyDetails } from '../api/company';
import { useAuth } from '../auth/AuthContext';
import { maskCnpj } from '../components/cnpj';
import { Field } from '../components/Field';
import { FormAlert } from '../components/FormAlert';
import { Bone, Loading } from '../components/Skeleton';
import { useResource } from '../components/useResource';
import { useSubmit } from '../components/useSubmit';
import { CheckIcon } from '../layout/icons';

function CompanyForm({ company, onSaved }: Readonly<{ company: CompanyDetails; onSaved: (company: CompanyDetails) => void }>) {
  const { refresh } = useAuth();
  const [name, setName] = useState(company.name);
  const [saved, setSaved] = useState(false);
  const unchanged = name.trim() === company.name;

  const save = useSubmit(async () => {
    const updated = await companyApi.rename(name.trim());
    onSaved(updated);
    setName(updated.name);
    await refresh();
    setSaved(true);
  });

  return (
    <form className="profile-form" onSubmit={save.onSubmit} noValidate>
      <FormAlert message={save.formError} />
      <div className="profile-fields">
        <Field
          label="Nome da empresa"
          autoComplete="organization"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setSaved(false);
          }}
          error={save.fieldError('name')}
        />
        <Field label="CNPJ" value={maskCnpj(company.cnpj)} readOnly hint="O CNPJ identifica a empresa e não pode ser alterado." />
      </div>
      <div className="form-actions">
        {saved && unchanged ? (
          <span className="saved-note">
            <CheckIcon />
            Salvo
          </span>
        ) : null}
        <button type="submit" className="button" disabled={save.pending || unchanged}>
          Salvar nome
        </button>
      </div>
    </form>
  );
}

export function CompanySection() {
  const company = useResource(companyApi.get);

  if (company.loading && !company.data) {
    return (
      <Loading label="Carregando dados da empresa…">
        <Bone h={44} r={11} />
      </Loading>
    );
  }
  if (company.error || !company.data) return <FormAlert message={company.error} />;
  return <CompanyForm company={company.data} onSaved={company.setData} />;
}
