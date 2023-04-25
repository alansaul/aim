enum PathEnum {
  Dashboard = '/',
  Explorers = '/explorers',
  Runs = '/runs',
  Metrics = '/explorers/metrics',
  Metrics_Id = '/explorers/metrics/:appId',
  Params = '/explorers/params',
  Params_Id = '/explorers/params/:appId',
  Tags = '/tags',
  Bookmarks = '/explorers/bookmarks',
  Run_Detail = '/runs/:runHash',
  Experiment = '/experiments/:experimentId',
  Boards = '/boards',
  Board = '/boards/:boardId',
  Board_Edit = '/boards/:boardId/edit',
  Reports = '/reports',
  Report = '/reports/:reportId',
  Report_Edit = '/reports/:reportId/edit',
  Scatters = '/explorers/scatters',
  Scatters_Id = '/explorers/scatters/:appId',
  Images_Explore = '/explorers/images',
  Images_Explore_Id = '/explorers/images/:appId',
  Figures_Explorer = '/explorers/figures',
  Audios_Explorer = '/explorers/audios',
  Text_Explorer = '/explorers/text',
  Metrics_Explorer = '/explorers/metrics_v2',
}

export { PathEnum };
