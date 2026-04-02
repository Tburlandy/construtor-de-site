import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { fetchContent } from "@/lib/content";
import { persistUtm, getUtmPayload, getDevice, nowLocal } from "@/lib/tracking";
import { sanitizeDigits, isValidBRPhone } from "@/lib/phone";
import { isValidWebhookUrl, sendWebhookToUrls } from "@/lib/webhookClient";
import type { Content } from "@/content/schema";

const SDR_OPTIONS = [{ label: "Brenda", value: "SDR Brenda" }];

const CONSUMO_OPTIONS = [
  "Consumo médio (em KWh)",
  "Consumo médio (em reais)",
];

const GERACAO_OPTIONS = [
  "Geração desejada (em KWh)",
  "Geração desejada (em reais)",
  "Quantidade de placas",
];

const MEDIDOR_OPTIONS = ["Monofásico", "Bifásico", "Trifásico"];

const SdrForm = () => {
  const { toast } = useToast();
  const [content, setContent] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    nome?: string;
    telefone?: string;
    endereco?: string;
    consumoValor?: string;
    geracaoValor?: string;
    tipoMedidor?: string;
    tipoTelhado?: string;
  }>({});

  const [formData, setFormData] = useState({
    sdr: SDR_OPTIONS[0].value,
    nome: "",
    telefone: "",
    endereco: "",
    consumoTipo: CONSUMO_OPTIONS[0],
    consumoValor: "",
    geracaoTipo: GERACAO_OPTIONS[0],
    geracaoValor: "",
    tipoMedidor: "",
    tipoTelhado: "",
    obs: "",
  });

  useEffect(() => {
    persistUtm();
    fetchContent()
      .then((data) => setContent(data))
      .finally(() => setLoading(false));
  }, []);

  const formatPhoneInput = (value: string) => {
    const digits = sanitizeDigits(value).slice(0, 11);
    if (!digits) return "";
    if (digits.length <= 2) {
      return `(${digits}`;
    }
    const ddd = digits.slice(0, 2);
    const rest = digits.slice(2);
    if (rest.length <= 5) {
      return `(${ddd}) ${rest}`;
    }
    return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
  };

  const validateForm = () => {
    const nextErrors: {
      nome?: string;
      telefone?: string;
      endereco?: string;
      consumoValor?: string;
      geracaoValor?: string;
      tipoMedidor?: string;
      tipoTelhado?: string;
    } = {};

    if (!formData.nome.trim()) {
      nextErrors.nome = "Preencha o nome.";
    } else if (formData.nome.trim().length < 2) {
      nextErrors.nome = "Nome deve ter pelo menos 2 caracteres.";
    }

    if (!formData.telefone.trim()) {
      nextErrors.telefone = "Preencha o telefone.";
    } else {
      const phoneDigits = sanitizeDigits(formData.telefone);
      if (!isValidBRPhone(phoneDigits)) {
        nextErrors.telefone = "Digite um telefone válido com DDD.";
      }
    }

    if (!formData.endereco.trim()) {
      nextErrors.endereco = "Preencha o endereço.";
    }

    if (!formData.consumoValor.trim()) {
      nextErrors.consumoValor = "Preencha o consumo médio.";
    }

    if (!formData.geracaoValor.trim()) {
      nextErrors.geracaoValor = "Preencha a geração desejada.";
    }

    if (!formData.tipoMedidor.trim()) {
      nextErrors.tipoMedidor = "Selecione o tipo de medidor.";
    }

    if (!formData.tipoTelhado.trim()) {
      nextErrors.tipoTelhado = "Preencha o tipo de telhado.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) {
      toast({
        title: "Verifique os campos",
        description: "Corrija os dados destacados para continuar.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      persistUtm();
      const trackingParams = getUtmPayload();
      const { data, horario } = nowLocal();

      const contentData = content || (await fetchContent().catch(() => null));
      const webhookUrl =
        contentData?.global?.webhookUrl || import.meta.env.VITE_WEBHOOK_URL || "";
      const secondaryWebhookUrl =
        contentData?.global?.secondaryWebhookUrl ||
        import.meta.env.VITE_WEBHOOK_URL_SECONDARY ||
        "";
      const formId =
        contentData?.global?.formId || import.meta.env.VITE_FORM_ID || "54b01719";
      const formName =
        contentData?.global?.formName ||
        import.meta.env.VITE_FORM_NAME ||
        "Acompanhamento";
      const canalId =
        contentData?.global?.canalId || import.meta.env.VITE_CANAL_ID || "";

      const params = new URLSearchParams({
        Nome: formData.nome.trim(),
        Telefone: formData.telefone,
        'Forma de Contato': formData.sdr,
        Endereço: formData.endereco.trim(),
        Consumo_medio_tipo: formData.consumoTipo,
        Consumo_medio_valor: formData.consumoValor.trim(),
        Geracao_desejada_tipo: formData.geracaoTipo,
        Geracao_desejada_valor: formData.geracaoValor.trim(),
        Tipo_de_medidor: formData.tipoMedidor,
        Tipo_de_telhado: formData.tipoTelhado.trim(),
        OBS: formData.obs.trim(),
        CampanhaID: trackingParams.CampanhaID || "",
        GrupoID: trackingParams.GrupoID || "",
        Extensão: trackingParams.Extensão || "",
        CorrespondenciaPalavra: trackingParams.CorrespondenciaPalavra || "",
        Dispositivo: trackingParams.Dispositivo || getDevice(),
        Anuncio: trackingParams.Anuncio || "",
        PalavraChave: trackingParams.PalavraChave || "",
        canal_id: canalId,
        Data: data,
        Horário: horario,
        form_id: formId,
        form_name: formName,
      });

      const urls = [secondaryWebhookUrl, webhookUrl].filter(isValidWebhookUrl);

      if (!urls.length) {
        toast({
          title: "Webhook não configurado",
          description: "Configure os webhooks antes de enviar o formulário.",
          variant: "destructive",
        });
        return;
      }

      const success = await sendWebhookToUrls(urls, params.toString());

      if (!success) {
        toast({
          title: "Falha ao enviar",
          description: "Tente novamente em alguns instantes.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Cadastro enviado",
        description: "Os dados foram registrados com sucesso.",
        className: "border-emerald-500/30 bg-emerald-500/15",
      });

      setFormData({
        sdr: SDR_OPTIONS[0].value,
        nome: "",
        telefone: "",
        endereco: "",
        consumoTipo: CONSUMO_OPTIONS[0],
        consumoValor: "",
        geracaoTipo: GERACAO_OPTIONS[0],
        geracaoValor: "",
        tipoMedidor: "",
        tipoTelhado: "",
        obs: "",
      });
      setErrors({});
    } finally {
      setIsSubmitting(false);
    }
  };

  const brand = content?.global?.brand || "EFITEC SOLAR";

  const inputBase =
    "w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#0ea5e9]/70 focus:ring-offset-0 focus:border-[#0ea5e9] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0ea5e9]/70 focus-visible:ring-offset-0 focus-visible:border-[#0ea5e9]";

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100"
      style={{
        fontFamily: "var(--font-inter)",
        background:
          "radial-gradient(circle at top, rgba(14,165,233,0.16), transparent 55%), radial-gradient(circle at bottom, rgba(15,23,42,0.9), rgba(15,23,42,1)), #020617",
      }}
    >
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-gradient-to-r from-slate-950 to-slate-900">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <a href="/" className="flex items-center gap-3">
            <img
              src="https://www.efitecsolar.com/assets/images/logo.png"
              alt={brand}
              className="h-10 w-auto"
              width="150"
              height="50"
              loading="eager"
              decoding="async"
            />
          </a>
        </div>
      </header>

      <main className="container mx-auto px-4 pb-16 pt-8 sm:pt-10 md:pt-14">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 text-left sm:mb-8">
            <h1
              className="mt-2 text-2xl font-semibold text-slate-50 sm:text-3xl md:text-4xl"
              style={{ fontFamily: "var(--font-poppins)" }}
            >
              Cadastro de leads
            </h1>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-[0_40px_120px_rgba(15,23,42,0.8)]">
            <form
              onSubmit={handleSubmit}
              noValidate
              className="space-y-5 p-5 sm:space-y-6 sm:p-8"
            >
              <div className="grid gap-5 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label className="text-[17px] text-slate-200">SDR *</Label>
                  <Select
                    value={formData.sdr}
                    onValueChange={(value) =>
                      setFormData({ ...formData, sdr: value })
                    }
                  >
                    <SelectTrigger className={`h-11 ${inputBase}`}>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {SDR_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="nome"
                    className={`text-[17px] ${
                      errors.nome ? "text-red-400" : "text-slate-200"
                    }`}
                  >
                    Nome completo *
                  </Label>
                  <Input
                    id="nome"
                    required
                    value={formData.nome}
                    onChange={(event) => {
                      setFormData({ ...formData, nome: event.target.value });
                      if (errors.nome) {
                        setErrors({ ...errors, nome: undefined });
                      }
                    }}
                    className={`${inputBase} h-11 ${errors.nome ? "border-red-500" : ""}`}
                    placeholder="Digite o nome"
                  />
                  {errors.nome && (
                    <p className="text-xs text-destructive">{errors.nome}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="telefone"
                    className={`text-[17px] ${
                      errors.telefone ? "text-red-400" : "text-slate-200"
                    }`}
                  >
                    Telefone *
                  </Label>
                  <Input
                    id="telefone"
                    type="tel"
                    inputMode="numeric"
                    pattern="\(\d{2}\)\s?\d{4,5}-\d{4}"
                    required
                    value={formData.telefone}
                    onChange={(event) => {
                      setFormData({
                        ...formData,
                        telefone: formatPhoneInput(event.target.value),
                      });
                      if (errors.telefone) {
                        setErrors({ ...errors, telefone: undefined });
                      }
                    }}
                    onBlur={() => {
                      if (!formData.telefone.trim()) {
                        setErrors({ ...errors, telefone: "Preencha o telefone." });
                      } else {
                        const phoneDigits = sanitizeDigits(formData.telefone);
                        if (!isValidBRPhone(phoneDigits)) {
                          setErrors({
                            ...errors,
                            telefone: "Digite um telefone válido com DDD.",
                          });
                        } else {
                          setErrors({ ...errors, telefone: undefined });
                        }
                      }
                    }}
                    className={`${inputBase} h-11 ${errors.telefone ? "border-red-500" : ""}`}
                    placeholder="(00) 00000-0000"
                  />
                  {errors.telefone && (
                    <p className="text-xs text-destructive">{errors.telefone}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label
                    htmlFor="endereco"
                    className={`text-[17px] ${
                      errors.endereco ? "text-red-400" : "text-slate-200"
                    }`}
                  >
                    Endereço *
                  </Label>
                  <Input
                    id="endereco"
                    required
                    value={formData.endereco}
                    onChange={(event) => {
                      setFormData({ ...formData, endereco: event.target.value });
                      if (errors.endereco) {
                        setErrors({ ...errors, endereco: undefined });
                      }
                    }}
                    className={`${inputBase} h-11 ${errors.endereco ? "border-red-500" : ""}`}
                    placeholder="Rua, número, bairro"
                  />
                  {errors.endereco && (
                    <p className="text-xs text-destructive">{errors.endereco}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="telhado"
                    className={`text-[17px] ${
                      errors.tipoTelhado ? "text-red-400" : "text-slate-200"
                    }`}
                  >
                    Tipo de telhado *
                  </Label>
                  <Input
                    id="telhado"
                    required
                    value={formData.tipoTelhado}
                    onChange={(event) => {
                      setFormData({ ...formData, tipoTelhado: event.target.value });
                      if (errors.tipoTelhado) {
                        setErrors({ ...errors, tipoTelhado: undefined });
                      }
                    }}
                    className={`${inputBase} h-11 ${errors.tipoTelhado ? "border-red-500" : ""}`}
                    placeholder="Ex: cerâmico, metálico, laje"
                  />
                  {errors.tipoTelhado && (
                    <p className="text-xs text-destructive">{errors.tipoTelhado}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    className={`text-[17px] ${
                      errors.tipoMedidor ? "text-red-400" : "text-slate-200"
                    }`}
                  >
                    Tipo de medidor *
                  </Label>
                  <Select
                    value={formData.tipoMedidor}
                    onValueChange={(value) => {
                      setFormData({ ...formData, tipoMedidor: value });
                      if (errors.tipoMedidor) {
                        setErrors({ ...errors, tipoMedidor: undefined });
                      }
                    }}
                  >
                    <SelectTrigger
                      className={`h-11 ${inputBase} ${
                        errors.tipoMedidor ? "border-red-500" : ""
                      }`}
                    >
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {MEDIDOR_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.tipoMedidor && (
                    <p className="text-xs text-destructive">{errors.tipoMedidor}</p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <Label
                  className={`text-[17px] ${
                    errors.consumoValor ? "text-red-400" : "text-slate-200"
                  }`}
                >
                  Consumo médio *
                </Label>
                <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
                  <Select
                    value={formData.consumoTipo}
                    onValueChange={(value) =>
                      setFormData({ ...formData, consumoTipo: value })
                    }
                  >
                    <SelectTrigger className={`h-11 ${inputBase}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONSUMO_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    required
                    value={formData.consumoValor}
                    onChange={(event) => {
                      setFormData({
                        ...formData,
                        consumoValor: sanitizeDigits(event.target.value),
                      });
                      if (errors.consumoValor) {
                        setErrors({ ...errors, consumoValor: undefined });
                      }
                    }}
                    inputMode="numeric"
                    className={`${inputBase} h-11 ${errors.consumoValor ? "border-red-500" : ""}`}
                    placeholder={
                      formData.consumoTipo.includes("reais")
                        ? "Ex: 350"
                        : "Ex: 450"
                    }
                  />
                </div>
                {errors.consumoValor && (
                  <p className="text-xs text-destructive">{errors.consumoValor}</p>
                )}
              </div>

              <div className="space-y-3">
                <Label
                  className={`text-[17px] ${
                    errors.geracaoValor ? "text-red-400" : "text-slate-200"
                  }`}
                >
                  Geração desejada *
                </Label>
                <div className="grid gap-3 sm:grid-cols-[240px_1fr]">
                  <Select
                    value={formData.geracaoTipo}
                    onValueChange={(value) =>
                      setFormData({ ...formData, geracaoTipo: value })
                    }
                  >
                    <SelectTrigger className={`h-11 ${inputBase}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GERACAO_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    required
                    value={formData.geracaoValor}
                    onChange={(event) => {
                      setFormData({
                        ...formData,
                        geracaoValor: sanitizeDigits(event.target.value),
                      });
                      if (errors.geracaoValor) {
                        setErrors({ ...errors, geracaoValor: undefined });
                      }
                    }}
                    inputMode="numeric"
                    className={`${inputBase} h-11 ${errors.geracaoValor ? "border-red-500" : ""}`}
                    placeholder={
                      formData.geracaoTipo.includes("placas")
                        ? "Ex: 12"
                        : formData.geracaoTipo.includes("reais")
                        ? "Ex: 400"
                        : "Ex: 600"
                    }
                  />
                </div>
                {errors.geracaoValor && (
                  <p className="text-xs text-destructive">{errors.geracaoValor}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="obs" className="text-[17px] text-slate-200">
                  OBS
                </Label>
                <Textarea
                  id="obs"
                  value={formData.obs}
                  onChange={(event) =>
                    setFormData({ ...formData, obs: event.target.value })
                  }
                  rows={4}
                  placeholder="Inclua observações importantes para o projeto."
                  className={inputBase}
                />
              </div>

              <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  type="submit"
                  disabled={isSubmitting || loading}
                  className="h-12 w-full rounded-lg border border-[#0ea5e9]/30 bg-[#0ea5e9]/20 px-3 py-3 text-[19px] font-medium text-[#0ea5e9] hover:bg-[#0ea5e9]/30 sm:w-auto"
                >
                  <span className="flex items-center gap-2">
                    <FileText size={20} />
                    {isSubmitting ? "Enviando..." : "Enviar cadastro"}
                  </span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SdrForm;
