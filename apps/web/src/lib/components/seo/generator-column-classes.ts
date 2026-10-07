export interface GeneratorColumnClasses {
  form: string;
  output: string;
  table: string;
}

const SINGLE_COLUMN_CLASS =
  "lg:col-span-12 lg:w-full lg:max-w-3xl lg:justify-self-center";

export function getGeneratorColumnClasses(
  singleColumn: boolean,
  wideForm: boolean,
): GeneratorColumnClasses {
  if (singleColumn) {
    return {
      form: SINGLE_COLUMN_CLASS,
      output: SINGLE_COLUMN_CLASS,
      table: SINGLE_COLUMN_CLASS,
    };
  }

  if (wideForm) {
    return {
      form: "lg:col-span-5",
      output: "lg:col-span-7",
      table: "lg:col-span-12",
    };
  }

  return {
    form: "lg:col-span-3",
    output: "lg:col-span-6",
    table: "lg:col-span-3",
  };
}
