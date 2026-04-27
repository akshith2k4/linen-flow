import { DATA_SOURCES, resolveDataSourceEndpoint, type DataSourceId } from "../../config/data-sources";

export function resolveFieldDataSource(field: any, accumulatedData: any): any {
  if (!field.data_source) return field;

  const ds = DATA_SOURCES[field.data_source as DataSourceId];
  if (!ds) {
    console.warn(`Unknown data_source: ${field.data_source}`);
    return field;
  }

  const endpoint = resolveDataSourceEndpoint(ds, accumulatedData) ?? ds.endpoint;

  if (ds.field_type === "lookup") {
    return {
      ...field,
      value_key: ds.value_key,
      label_key: ds.label_key,
      search_on_frontend: ds.search_on_frontend ?? false,
      search_config: {
        endpoint,
        value_key: ds.value_key,
        label_key: ds.label_key,
        search_param: ds.search_param ?? "name"
      },
      ...(ds.depends_on ? { depends_on: ds.depends_on } : {})
    };
  }

  return {
    ...field,
    type: "dropdown",
    api_source: endpoint,
    value_key: ds.value_key,
    label_key: ds.label_key,
    ...(ds.depends_on ? { depends_on: ds.depends_on } : {})
  };
}
