'use client';

import {
  BreakpointDisplay,
  Button,
  Card,
  CardList,
  Container,
  Flex,
  PlaceholderStack,
  Section,
  SvgIcon,
  Text,
} from '@near-pagoda/ui';
import { Folder, LockKey } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { type z } from 'zod';

import { Code } from '~/components/lib/Code';
import { Sidebar } from '~/components/lib/Sidebar';
import { useCurrentEntryParams } from '~/hooks/entries';
import { useQueryParams } from '~/hooks/url';
import { type entryModel } from '~/lib/models';
import { useAuthStore } from '~/stores/auth';
import { trpc } from '~/trpc/TRPCProvider';
import { filePathToCodeLanguage } from '~/utils/file';

const METADATA_FILE_PATH = 'metadata.json';

type Props = {
  entry: z.infer<typeof entryModel>;
};

export const EntrySource = ({ entry }: Props) => {
  const auth = useAuthStore((store) => store.auth);
  const isPermittedToViewSource =
    !entry.details.private_source || auth?.accountId === entry.namespace;
  const { createQueryPath, queryParams } = useQueryParams(['file']);
  const params = useCurrentEntryParams();

  const filePathsQuery = trpc.hub.filePaths.useQuery(params, {
    enabled: isPermittedToViewSource,
  });
  const activeFilePath = queryParams.file ?? filePathsQuery.data?.[0] ?? '';
  const activeFileIsCompressed =
    activeFilePath.endsWith('.zip') || activeFilePath.endsWith('.tar');

  const fileQuery = trpc.hub.file.useQuery(
    { ...params, filePath: activeFilePath },
    {
      enabled:
        !!activeFilePath &&
        activeFilePath !== METADATA_FILE_PATH &&
        !activeFileIsCompressed &&
        isPermittedToViewSource,
    },
  );

  const [sidebarOpenForSmallScreens, setSidebarOpenForSmallScreens] =
    useState(false);

  let openedFile =
    activeFilePath === fileQuery.data?.path ? fileQuery.data : undefined;
  if (activeFilePath === METADATA_FILE_PATH) {
    const metadata = {
      category: entry.category,
      namespace: entry.namespace,
      name: entry.name,
      version: entry.version,
      description: entry.description,
      tags: entry.tags,
      details: entry.details,
    };
    openedFile = {
      content: JSON.stringify(metadata ?? '{}', null, 2),
      path: METADATA_FILE_PATH,
    };
  }

  useEffect(() => {
    setSidebarOpenForSmallScreens(false);
  }, [queryParams.file]);

  if (!isPermittedToViewSource) {
    return (
      <Section grow="available">
        <Container size="s" style={{ margin: 'auto', textAlign: 'center' }}>
          <Flex direction="column" gap="m" align="center">
            <SvgIcon icon={<LockKey />} size="l" color="amber-11" />
            <Text size="text-xl">Private Source Code</Text>
            <Text>
              You {`don't`} have permission to view the source code for this{' '}
              {entry.category}.
            </Text>
          </Flex>
        </Container>
      </Section>
    );
  }

  return (
    <>
      <Sidebar.Root>
        <Sidebar.Sidebar
          openForSmallScreens={sidebarOpenForSmallScreens}
          setOpenForSmallScreens={setSidebarOpenForSmallScreens}
        >
          <Text size="text-xs" weight={600} uppercase>
            Files
          </Text>

          {filePathsQuery.data ? (
            <Sidebar.SidebarContentBleed>
              <CardList>
                {filePathsQuery.data?.map((path) => (
                  <Card
                    padding="s"
                    paddingInline="m"
                    href={createQueryPath({ file: path })}
                    key={path}
                    background={path === activeFilePath ? 'sand-0' : 'sand-2'}
                  >
                    <Text
                      size="text-s"
                      color="sand-12"
                      weight={500}
                      clampLines={1}
                    >
                      {path}
                    </Text>
                  </Card>
                ))}
              </CardList>
            </Sidebar.SidebarContentBleed>
          ) : (
            <PlaceholderStack />
          )}
        </Sidebar.Sidebar>

        <Sidebar.Main>
          <Flex align="center" gap="m" style={{ marginBlock: '-3px' }}>
            <Text size="text-l" style={{ marginRight: 'auto' }}>
              {activeFilePath}
            </Text>

            <BreakpointDisplay show="sidebar-small-screen">
              <Button
                label="View All Files"
                icon={<Folder />}
                size="small"
                fill="outline"
                onClick={() => setSidebarOpenForSmallScreens(true)}
              />
            </BreakpointDisplay>
          </Flex>
          {activeFileIsCompressed ? (
            <Text>This file type {`doesn't`} have a source preview.</Text>
          ) : (
            <>
              {openedFile ? (
                <Code
                  bleed
                  source={openedFile.content}
                  language={filePathToCodeLanguage(openedFile.path)}
                />
              ) : (
                <PlaceholderStack />
              )}
            </>
          )}
        </Sidebar.Main>
      </Sidebar.Root>
    </>
  );
};
