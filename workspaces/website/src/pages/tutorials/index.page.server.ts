import { PageContextServer } from "src/renderer/types";
import { Props } from "src/pages/tutorials/TutorialsPage";
import { getDefaultPageContext } from "src/renderer/helpers";

export async function onBeforeRender(pageContext: PageContextServer) {
  const defaultPageContext = await getDefaultPageContext(pageContext);
  const { locale } = defaultPageContext;

  const pageProps: Props = {
    seo: defaultPageContext.seo.jobs,
    env: {
      ALGOLIA_INDEX: import.meta.env.VITE_ALGOLIA_INDEX!,
      ALGOLIA_APP_ID: import.meta.env.VITE_ALGOLIA_APP_ID!,
      ALGOLIA_SEARCH_API_KEY: import.meta.env.VITE_ALGOLIA_SEARCH_API_KEY!,
    },
    params: {
      locale,
    },
  };

  return {
    pageContext: {
      ...defaultPageContext,
      pageProps,
    },
  };
}
