import type { LandingPageData } from "./templates/modern";
import { render as modern } from "./templates/modern";
import { render as food } from "./templates/food";
import { render as product } from "./templates/product";
import { render as affiliate } from "./templates/affiliate";
import { render as personal } from "./templates/personal";
import { render as office } from "./templates/office";
import { render as restaurant } from "./templates/restaurant";
import { render as business } from "./templates/business";
import { render as tech } from "./templates/tech";

type RenderFunction = (data: LandingPageData) => Promise<string>;

const templates: Record<string, RenderFunction> = {
  modern,
  food,
  "food-n-drink": food,
  product,
  affiliate,
  personal,
  office,
  restaurant,
  business,
  tech,
};

export async function renderTemplate(
  template: string,
  data: LandingPageData
): Promise<string> {
  const renderFn = templates[template] || templates.office;
  return await renderFn(data);
}
