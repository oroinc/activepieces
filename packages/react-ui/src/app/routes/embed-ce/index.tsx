import React from 'react';
import { flushSync } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useEffectOnce } from 'react-use';

import { memoryRouter } from '@/app/guards';
import { useEmbedding } from '@/components/embed-provider';
import { useTheme } from '@/components/theme-provider';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { useAuthorization } from '@/hooks/authorization-hooks';
import {
  combinePaths,
  determineDefaultRoute,
  parentWindow,
  routesThatRequireProjectId,
} from '@/lib/utils';
import {
  ActivepiecesClientAuthenticationSuccess,
  ActivepiecesClientConfigurationFinished,
  ActivepiecesClientEventName,
  ActivepiecesClientInit,
  ActivepiecesVendorEventName,
  ActivepiecesVendorInit,
  ActivepiecesVendorRouteChanged,
} from 'ee-embed-sdk';

// Copied from embed/index.tsx — notifies host that auth + config are done
const notifyVendorPostAuthentication = () => {
  const authenticationSuccessEvent: ActivepiecesClientAuthenticationSuccess = {
    type: ActivepiecesClientEventName.CLIENT_AUTHENTICATION_SUCCESS,
    data: {},
  };
  parentWindow.postMessage(authenticationSuccessEvent, '*');
  const configurationFinishedEvent: ActivepiecesClientConfigurationFinished = {
    type: ActivepiecesClientEventName.CLIENT_CONFIGURATION_FINISHED,
    data: {},
  };
  parentWindow.postMessage(configurationFinishedEvent, '*');
};

// Copied from embed/index.tsx — listens for VENDOR_ROUTE_CHANGED from host
const handleVendorNavigation = ({ projectId }: { projectId: string }) => {
  const handleVendorRouteChange = (
    event: MessageEvent<ActivepiecesVendorRouteChanged>,
  ) => {
    if (
      event.source === parentWindow &&
      event.data.type === ActivepiecesVendorEventName.VENDOR_ROUTE_CHANGED
    ) {
      const targetRoute = event.data.data.vendorRoute;
      const targetRouteRequiresProjectId = Object.values(
        routesThatRequireProjectId,
      ).some((route) => targetRoute.includes(route));
      if (!targetRouteRequiresProjectId) {
        memoryRouter.navigate(targetRoute);
      } else {
        memoryRouter.navigate(
          combinePaths({
            secondPath: targetRoute,
            firstPath: `/projects/${projectId}`,
          }),
        );
      }
    }
  };
  window.addEventListener('message', handleVendorRouteChange);
};

// Copied from embed/index.tsx — posts CLIENT_ROUTE_CHANGED to host on navigation
const handleClientNavigation = () => {
  memoryRouter.subscribe((state) => {
    const pathNameWithoutProjectOrProjectId = state.location.pathname.replace(
      /\/projects\/[^/]+/,
      '',
    );
    parentWindow.postMessage(
      {
        type: ActivepiecesClientEventName.CLIENT_ROUTE_CHANGED,
        data: {
          route: pathNameWithoutProjectOrProjectId + state.location.search,
        },
      },
      '*',
    );
  });
};

const EmbedCePage = React.memo(() => {
  const { setEmbedState, embedState } = useEmbedding();
  const { setTheme } = useTheme();
  const { i18n } = useTranslation();
  const { checkAccess } = useAuthorization();

  const initState = (event: MessageEvent<ActivepiecesVendorInit>) => {
    if (
      event.source !== parentWindow ||
      event.data.type !== ActivepiecesVendorEventName.VENDOR_INIT
    ) {
      return;
    }

    // CE: no jwtToken exchange — token is already in localStorage from the
    // parent app (same origin). We just read it directly.
    const token = window.localStorage.getItem('token');
    const projectId = window.localStorage.getItem('projectId');

    if (!token || !projectId) {
      memoryRouter.navigate('/sign-in');
      return;
    }

    if (event.data.data.mode) {
      setTheme(event.data.data.mode);
    }

    if (event.data.data.locale) {
      i18n.changeLanguage(event.data.data.locale);
    }

    const configuredRoute = event.data.data.initialRoute ?? '/';
    const defaultRoute = determineDefaultRoute(checkAccess);
    const initialRoute =
      configuredRoute === '/' ? defaultRoute : configuredRoute;

    // Must use flushSync so the router switches to memoryRouter before navigate,
    // mirroring the same pattern used in the original EmbedPage.
    flushSync(() => {
      setEmbedState({
        isEmbedded: true,
        hideSideNav: event.data.data.hideSidebar ?? true,
        hideFlowsPageNavbar: event.data.data.hideFlowsPageNavbar ?? false,
        disableNavigationInBuilder:
          event.data.data.disableNavigationInBuilder !== false,
        hideFolders: event.data.data.hideFolders ?? false,
        hideFlowNameInBuilder: event.data.data.hideFlowNameInBuilder ?? false,
        sdkVersion: event.data.data.sdkVersion,
        fontUrl: event.data.data.fontUrl,
        fontFamily: event.data.data.fontFamily,
        useDarkBackground: false,
        hideExportAndImportFlow:
          event.data.data.hideExportAndImportFlow ?? false,
        hideHomeButtonInBuilder:
          event.data.data.disableNavigationInBuilder === 'keep_home_button_only'
            ? false
            : event.data.data.disableNavigationInBuilder,
        emitHomeButtonClickedEvent:
          event.data.data.emitHomeButtonClickedEvent ?? false,
        homeButtonIcon: event.data.data.homeButtonIcon ?? 'logo',
        hideDuplicateFlow: event.data.data.hideDuplicateFlow ?? false,
        hidePageHeader: event.data.data.hidePageHeader ?? false,
      });
    });

    memoryRouter.navigate(initialRoute);
    handleVendorNavigation({ projectId });
    handleClientNavigation();
    notifyVendorPostAuthentication();
  };

  useEffectOnce(() => {
    // Send CLIENT_INIT to signal the host that the iframe is ready.
    // The host (JS component) should reply with VENDOR_INIT carrying config.
    // If no VENDOR_INIT arrives within the listener lifetime, the page stays
    // on the loading screen — the JS component must handle this.
    const initEvent: ActivepiecesClientInit = {
      type: ActivepiecesClientEventName.CLIENT_INIT,
      data: {},
    };
    parentWindow.postMessage(initEvent, '*');
    window.addEventListener('message', initState);
    return () => {
      window.removeEventListener('message', initState);
    };
  });

  return <LoadingScreen brightSpinner={embedState.useDarkBackground} />;
});

EmbedCePage.displayName = 'EmbedCePage';
export { EmbedCePage };
