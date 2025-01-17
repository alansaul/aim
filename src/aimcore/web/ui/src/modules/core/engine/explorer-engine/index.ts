import createReact, { StoreApi, UseBoundStore } from 'zustand';
import type { Update } from 'history';

import createVanilla from 'zustand/vanilla';
import { devtools, subscribeWithSelector } from 'zustand/middleware';

import { PipelineOptions } from 'modules/core/pipeline';
import { ExplorerEngineConfiguration } from 'modules/BaseExplorer/types';
import getUrlSearchParam from 'modules/core/utils/getUrlSearchParam';
import browserHistory from 'modules/core/services/browserHistory';
import getQueryParamsFromState from 'modules/core/utils/getQueryParamsFromState';

import { AimFlatObjectBase } from 'types/core/AimObjects';
import { SequenceType } from 'types/core/enums';

import createPipelineEngine, { IPipelineEngine } from '../pipeline';
import createInstructionsEngine, { IInstructionsEngine } from '../instructions';
import { INotificationsState, PipelineStatusEnum } from '../types';
import createVisualizationsEngine from '../visualizations';
import createExplorerAdditionalEngine from '../explorer';
import createCustomStatesEngine, { CustomStatesEngine } from '../custom-states';
import createEventSystemEngine, { IEventSystemEngine } from '../event-system';
import createBlobURISystemEngine, {
  IBlobURISystemEngine,
} from '../blob-uri-system';
import createNotificationsEngine, {
  INotificationsEngine,
} from '../notifications';

type State = {
  pipeline?: any;
  instructions?: any;
  explorer?: any;
  visualizations?: any;
  events?: IEventSystemEngine['state'];
  blobURI?: any;
  notifications?: INotificationsState;
};

export type EngineNew<TStore, TObject, SequenceName extends SequenceType> = {
  // sub engines
  pipeline: IPipelineEngine<TObject, TStore>['engine'];
  instructions: IInstructionsEngine<TStore, SequenceName>['engine'];
  events: IEventSystemEngine['engine'];
  notifications: INotificationsEngine<TStore>['engine'];
  visualizations: any;

  // methods
  initialize: () => () => void;
  finalize: () => void;

  // store helpers
  useStore: UseBoundStore<StoreApi<TStore>>;
  subscribeToStore: (listener: (state: TStore) => void) => void;
} & CustomStatesEngine;

function getPipelineEngine(
  config: ExplorerEngineConfiguration,
  set: any,
  get: any,
  state: State, // mutable
  notificationsEngine: INotificationsEngine<State>['engine'],
) {
  const useCache = config.enablePipelineCache;

  // const defaultControls = config.controls || {};

  const pipelineOptions: Omit<PipelineOptions, 'callbacks'> = {
    sequenceType: config.sequenceType,
    adapter: {
      objectDepth: config.adapter.objectDepth,
      useCache,
    },
    grouping: {
      useCache,
    },
    query: {
      useCache,
    },
    custom: {
      useCache,
    },
    persist: config.persist,
  };

  const pipeline = createPipelineEngine<object, AimFlatObjectBase>(
    { setState: set, getState: get },
    pipelineOptions,
    config.groupings,
    notificationsEngine,
  );

  state['pipeline'] = pipeline.state.pipeline;

  return pipeline.engine;
}

function getInstructionsEngine(
  config: ExplorerEngineConfiguration,
  set: any,
  get: any,
  state: State, // mutable,
  notificationsEngine: INotificationsEngine<State>['engine'],
) {
  const instructions = createInstructionsEngine<object>(
    { setState: set, getState: get },
    { sequenceType: config.sequenceType },
    notificationsEngine,
  );

  state['instructions'] = instructions.state.instructions;

  return instructions.engine;
}

function getExplorerAdditionalEngines(
  config: ExplorerEngineConfiguration,
  set: any,
  get: any,
  // state: State, // mutable
  persist?: boolean, //StatePersistOption,
) {
  return createExplorerAdditionalEngine<State>(
    config,
    {
      setState: set,
      getState: get,
    },
    persist,
  );
}

function getVisualizationsEngine(
  config: ExplorerEngineConfiguration,
  set: any,
  get: any,
  state: State,
) {
  const visualizations = createVisualizationsEngine<State>(
    config.visualizations,
    {
      setState: set,
      getState: get,
    },
    config.persist,
  );

  state['visualizations'] = visualizations.state.visualizations;

  return visualizations.engine;
}

function getEventSystemEngine(
  state: State, // mutable
  set: any,
  get: any,
) {
  const events = createEventSystemEngine({ setState: set, getState: get });

  state['events'] = events.state;

  return events.engine;
}

function getBlobURIEngine(config: ExplorerEngineConfiguration) {
  const blobURI = createBlobURISystemEngine(config.sequenceType);

  return blobURI.engine;
}

function getNotificationsEngine(
  state: State, // mutable
  set: any,
  get: any,
) {
  const notifications = createNotificationsEngine<State>({
    setState: set,
    getState: get,
  });

  state['notifications'] = notifications.state.notifications;

  return notifications.engine;
}

function getCustomStatesEngine(
  config: ExplorerEngineConfiguration,
  set: any,
  get: any,
) {
  const customStates = createCustomStatesEngine(
    config,
    {
      setState: set,
      getState: get,
    },
    config.persist,
  );

  return {
    initialState: customStates.state.customStates,
    engine: customStates.engine,
  };
}

function createEngine<TObject = any>(
  config: ExplorerEngineConfiguration,
  basePath: string,
  name: string = 'ExplorerEngine',
  devtool: boolean = false,
): EngineNew<object, AimFlatObjectBase<TObject>, typeof config.sequenceType> {
  let notifications: INotificationsEngine<State>['engine'];
  let pipeline: IPipelineEngine<AimFlatObjectBase<TObject>, object>['engine'];
  let instructions: IInstructionsEngine<
    object,
    typeof config.sequenceType
  >['engine'];

  let visualizations: any;

  let customStates: CustomStatesEngine;
  let events: IEventSystemEngine['engine'];
  let blobURI: IBlobURISystemEngine['engine'];
  let query: any;
  let groupings: any;
  let initialState = {};

  function buildEngine(set: any, get: any) {
    /**
     * Notifications engine
     */
    notifications = getNotificationsEngine(initialState, set, get);

    /**
     * Custom states
     */
    const {
      initialState: customStatesInitialState,
      engine: customStatesEngine,
    } = getCustomStatesEngine(config, set, get);

    initialState = {
      ...initialState,
      ...customStatesInitialState,
    };
    customStates = customStatesEngine;

    /**
     * Explorer Additional, includes query and groupings
     */
    const explorer = getExplorerAdditionalEngines(
      config,
      set,
      get,
      config.persist,
    );
    initialState = {
      ...initialState,
      ...explorer.initialState,
    };

    query = explorer.engine.query;
    groupings = explorer.engine.groupings;

    /**
     * Instructions
     */
    instructions = getInstructionsEngine(
      config,
      set,
      get,
      initialState,
      notifications,
    );

    /**
     * Pipeline
     */
    pipeline = getPipelineEngine(config, set, get, initialState, notifications);

    /**
     * Visualizations
     */
    visualizations = getVisualizationsEngine(config, set, get, initialState);

    /** Additional **/

    /**
     * Event System
     */
    events = getEventSystemEngine(initialState, set, get);

    /**
     * Blob URI System
     */
    blobURI = getBlobURIEngine(config);

    return initialState;
  }

  // @ts-ignore
  const store = createVanilla<StoreApi<object>>(
    // @ts-ignore
    subscribeWithSelector(
      devtool
        ? // @ts-ignore
          devtools(buildEngine, {
            name,
            anonymousActionType: 'UNKNOWN_ACTION',
            serialize: { options: true },
          })
        : buildEngine,
    ),
  );

  // @ts-ignore
  const useReactStore = createReact<StoreApi<object>>(store);
  /*
   * An initializer to use for url sync and bookmarks data get
   */
  function initialize(): () => void {
    const finalizeQuery = query.initialize();
    const finalizeGrouping = groupings.initialize();
    const finalizePipeline = pipeline.initialize();
    const finalizeVisualizations = visualizations.initialize(name);
    const finalizeCustomStates = customStates.initialize();

    // subscribe to history
    instructions
      .getInstructions()
      .then((isEmpty) => {
        if (isEmpty) {
          pipeline.changeCurrentPhaseOrStatus(
            PipelineStatusEnum.Insufficient_Resources,
          );
        } else if (config.persist) {
          const stateFromStorage = getUrlSearchParam('query') || {};
          if (stateFromStorage.form && stateFromStorage.ranges) {
            pipeline.search(getQueryParamsFromState(stateFromStorage), true);
          }
        } else if (config.initialState?.query) {
          pipeline.search(
            getQueryParamsFromState(config.initialState.query),
            true,
          );
        }
      })
      // eslint-disable-next-line no-console
      .catch(console.error);

    if (config.persist) {
      if (!basePath && basePath !== '') {
        throw new Error('Specify [basePath] argument of engine configuration.');
      }
    }

    const removeHistoryListener =
      config.persist &&
      browserHistory.listen((update: Update) => {
        localStorage.setItem(
          `${basePath}Url`,
          update.location.pathname + update.location.search,
        );
      });

    return () => {
      finalizeQuery();
      finalizeGrouping();
      finalizePipeline();
      finalizeVisualizations();
      finalizeCustomStates();
      removeHistoryListener && removeHistoryListener();

      finalize();
    };
  }
  /**
   * Clean ups
   *    destroy states
   *    clear caches
   *    save current url in local storage
   */
  function finalize() {
    // @ts-ignore
    useReactStore.destroy(); // or engine.release/commit
    useReactStore.setState(initialState);
    // pipeline.destroy(); // or pipeline release/commit
  }

  // @ts-ignore
  const engine: EngineNew<
    object,
    AimFlatObjectBase<TObject>,
    typeof config.sequenceType
  > = {
    useStore: useReactStore,
    subscribeToStore: useReactStore.subscribe,
    // @ts-ignore
    instructions,
    visualizations,
    // @ts-ignore
    ...customStates,
    query,
    groupings,
    // @ts-ignore
    pipeline,
    // @ts-ignore
    events,
    // @ts-ignore
    blobURI,
    // @ts-ignore
    notifications,
    finalize,
    initialize,
  };

  if (__DEV__) {
    // @ts-ignore
    window[name] = engine;
  }

  return engine;
}

export default createEngine;
