// postMessage contract between /embed-ce and the Oro page that hosts it in an
// iframe. The host uses the message format of the upstream embed SDK, so the
// `type` strings must stay as they are. Declared here instead of imported from
// ee-embed-sdk, so that Oro code does not depend on the enterprise-licensed
// packages/ee. Only the messages and fields /embed-ce uses are declared.

export enum EmbedCeClientEvent {
  INIT = 'CLIENT_INIT',
  AUTHENTICATION_SUCCESS = 'CLIENT_AUTHENTICATION_SUCCESS',
  CONFIGURATION_FINISHED = 'CLIENT_CONFIGURATION_FINISHED',
  ROUTE_CHANGED = 'CLIENT_ROUTE_CHANGED',
}

export type EmbedCeClientMessage =
  | {
      type:
        | EmbedCeClientEvent.INIT
        | EmbedCeClientEvent.AUTHENTICATION_SUCCESS
        | EmbedCeClientEvent.CONFIGURATION_FINISHED;
      data: Record<string, never>;
    }
  | {
      type: EmbedCeClientEvent.ROUTE_CHANGED;
      data: { route: string };
    };

export enum EmbedCeHostEvent {
  INIT = 'VENDOR_INIT',
  ROUTE_CHANGED = 'VENDOR_ROUTE_CHANGED',
}

export type EmbedCeHostInitMessage = {
  type: EmbedCeHostEvent.INIT;
  data: {
    initialRoute?: string;
    locale?: string;
    mode?: 'light' | 'dark';
    hideSidebar: boolean;
    hideFlowNameInBuilder?: boolean;
    disableNavigationInBuilder: boolean | 'keep_home_button_only';
    hideFolders?: boolean;
    hideTables?: boolean;
    hideExportAndImportFlow?: boolean;
    hideDuplicateFlow?: boolean;
    hideFlowsPageNavbar?: boolean;
    hidePageHeader?: boolean;
    hideActiveUsers?: boolean;
    hideGlobalSearch?: boolean;
    emitHomeButtonClickedEvent?: boolean;
    homeButtonIcon?: 'back' | 'logo';
    sdkVersion?: string;
    fontUrl?: string;
    fontFamily?: string;
    formulasDocsUrl?: string;
    gtmContainerId?: string;
    clarityProjectId?: string;
  };
};

export type EmbedCeHostRouteChangedMessage = {
  type: EmbedCeHostEvent.ROUTE_CHANGED;
  data: { vendorRoute: string };
};
