type PageResult<Row> = {
  data: Row[] | null;
  error: { message: string } | null;
  count?: number | null;
};
type PageQuery<Row> = {
  range: (from: number, to: number) => PromiseLike<PageResult<Row>>;
};

/** Read beyond the API row limit so totals represent the complete authorized workspace. */
export async function loadWorkspaceRows<Row>(query: PageQuery<Row>): Promise<PageResult<Row>> {
  const rows: Row[] = [];
  const pageSize = 500;
  for (;;) {
    const result = await query.range(rows.length, rows.length + pageSize - 1);
    if (result.error) return { data: null, error: result.error };
    const page = result.data ?? [];
    rows.push(...page);
    if (result.count != null ? rows.length >= result.count : page.length < pageSize) {
      return { data: rows, error: null, count: result.count };
    }
    if (!page.length) return { data: null, error: { message: "Workspace data was incomplete. Refresh to retry." } };
  }
}
