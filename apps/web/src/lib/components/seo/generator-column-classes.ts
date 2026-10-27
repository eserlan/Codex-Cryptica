export interface GeneratorColumnClasses {
  /** The grid that holds the columns (width, padding and tracks). */
  container: string;
  form: string;
  output: string;
  table: string;
}

/** Outer width of the generator canvas and its explainer strip. */
export const GENERATOR_CANVAS_CLASS = "mx-auto w-full max-w-7xl";
const GENERATOR_CANVAS_ULTRAWIDE = "2xl:max-w-[96rem]";

const BASE_CONTAINER = `${GENERATOR_CANVAS_CLASS} px-4 sm:px-6 py-12 flex-grow grid grid-cols-1 lg:grid-cols-12 gap-8`;

const SINGLE_COLUMN_CLASS =
  "lg:col-span-12 lg:w-full lg:max-w-3xl lg:justify-self-center";

export function getGeneratorColumnClasses(
  singleColumn: boolean,
  wideForm: boolean,
): GeneratorColumnClasses {
  if (singleColumn) {
    return {
      container: BASE_CONTAINER,
      form: SINGLE_COLUMN_CLASS,
      output: SINGLE_COLUMN_CLASS,
      table: SINGLE_COLUMN_CLASS,
    };
  }

  if (wideForm) {
    return {
      container: BASE_CONTAINER,
      form: "lg:col-span-5",
      output: "lg:col-span-7",
      table: "lg:col-span-12",
    };
  }

  // Ultra-wide screens give the extra room to the output only: the form and
  // the rail stay a comfortable fixed width and the middle track takes the rest.
  return {
    container: `${BASE_CONTAINER} ${GENERATOR_CANVAS_ULTRAWIDE} 2xl:grid-cols-[19rem_minmax(0,1fr)_19rem]`,
    form: "lg:col-span-3 2xl:col-span-1",
    output: "lg:col-span-6 2xl:col-span-1",
    table: "lg:col-span-3 2xl:col-span-1",
  };
}
