import { MintInfo } from '@solana/spl-token'
import {
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'
import BN from 'bn.js'
import useRealm from '../hooks/useRealm'
import { getProposal, Proposal, ProposalState } from '@solana/spl-governance'
import { getUnrelinquishedVoteRecords } from '../models/api'
import { withDepositGoverningTokens } from '@solana/spl-governance'
import { withRelinquishVote } from '@solana/spl-governance'
import { withWithdrawGoverningTokens } from '@solana/spl-governance'
import useWalletStore from '../stores/useWalletStore'
import { sendTransaction } from '../utils/send'
import { approveTokenTransfer } from '../utils/tokens'
import Button from './Button'
import { Option } from '../tools/core/option'
import { GoverningTokenType } from '@solana/spl-governance'
import { fmtMintAmount } from '../tools/sdk/units'
import { getMintMetadata } from './instructions/programs/splToken'
import { withFinalizeVote } from '@solana/spl-governance'
import { chunks } from '@utils/helpers'
import { getProgramVersionForRealm } from '@models/registry/api'
import Input from './inputs/Input'
import React, {
  FunctionComponent,
  useCallback,
  useEffect,
  useState,
} from 'react'
import {
  ChatAltIcon,
  MailIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/solid'
import {
  useCreateAlert,
  useCreateEmailTarget,
  useCreateSmsTarget,
  useCreateTargetGroup,
  useCreateTelegramTarget,
  useGetFilters,
  useGetSourceGroups,
  useGetTargetGroups,
  useLoginFromDao,
  useNotifiJwt,
  useUpdateTargetGroup,
} from '@notifi-network/notifi-react-hooks'

function bufferToBase64(buf) {
  const binstr = Array.prototype.map
    .call(buf, function (ch) {
      return String.fromCharCode(ch)
    })
    .join('')
  return btoa(binstr)
}

const NotificationsCard = ({ proposal }: { proposal?: Option<Proposal> }) => {
  const { councilMint, mint, realm } = useRealm()
  const [isLoading, setLoading] = useState<boolean>(false)
  const [hasUnsavedChanges, setUnsavedChanges] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [phone, setPhone] = useState<string>('')
  const [telegram, setTelegram] = useState<string>('')
  const [sourceGroup, setSourceGroup] = useState<string>('')
  const [filter, setFilter] = useState<string>('')
  const [targetGroup, setTargetGroup] = useState<string>('')
  const [storedEmail, setStoredEmail] = useState<string>('')
  const [storedSms, setStoredSms] = useState<string>('')
  const [storedTelegram, setStoredTelegram] = useState<string>('')
  const [storedEmailId, setStoredEmailId] = useState<string>('')
  const [storedSmsId, setStoredSmsId] = useState<string>('')
  const [storedTelegramId, setStoredTelegramId] = useState<string>('')
  const enableTelegramInput = false
  const isDepositVisible = (
    depositMint: MintInfo | undefined,
    realmMint: PublicKey | undefined
  ) =>
    depositMint &&
    (!proposal ||
      (proposal.isSome() &&
        proposal.value.governingTokenMint.toBase58() === realmMint?.toBase58()))

  const communityDepositVisible =
    // If there is no council then community deposit is the only option to show
    !realm?.account.config.councilMint ||
    isDepositVisible(mint, realm?.account.communityMint)
  const wallet = useWalletStore((s) => s.current)
  const connected = useWalletStore((s) => s.connected)
  const connection = useWalletStore((s) => s.connection.current)

  const getTargetGroups = useGetTargetGroups()
  const getExistingTargetGroup = useCallback(() => {
    getTargetGroups({})
      .then((resp) => {
        const targetGroup = resp[0]
        console.log(targetGroup)
        if (targetGroup != null) {
          setTargetGroup(targetGroup.id ?? '')
          if (targetGroup.emailTargets.length > 0) {
            const emailTarget = targetGroup.emailTargets[0]
            setEmail(emailTarget.emailAddress ?? '')
            setStoredEmail(emailTarget.emailAddress ?? '')
            setStoredEmailId(emailTarget.id ?? '')
          }
          if (targetGroup.smsTargets.length > 0) {
            const smsTarget = targetGroup.smsTargets[0]
            setPhone(smsTarget.phoneNumber ?? '')
            setStoredSms(smsTarget.phoneNumber ?? '')
            setStoredSmsId(smsTarget.id ?? '')
          }
          if (targetGroup.telegramTargets.length > 0) {
            const telegramTarget = targetGroup.telegramTargets[0]
            setTelegram(telegramTarget.telegramId ?? '')
            setStoredTelegram(telegramTarget.telegramId ?? '')
            setStoredTelegramId(telegramTarget.id ?? '')
          }
        }
      })
      .catch((err) => {
        console.log('Request failed: ' + JSON.stringify(err))
      })
  }, [getTargetGroups])

  const getSourceGroups = useGetSourceGroups()
  const getSourceGroup = useCallback(() => {
    getSourceGroups({})
      .then((resp) => {
        const sourceGroup = resp[0]
        console.log(sourceGroup)
        setSourceGroup(sourceGroup.id ?? '')
      })
      .catch((err) => {
        console.log('Request failed: ' + JSON.stringify(err))
      })
  }, [getSourceGroups])

  const getFilters = useGetFilters()
  const getFilter = useCallback(() => {
    getFilters({})
      .then((resp) => {
        const filter = resp[0]
        console.log(filter)
        setFilter(filter.id ?? '')
      })
      .catch((err) => {
        console.log('Request failed: ' + JSON.stringify(err))
      })
  }, [getFilters])

  const doCreateAlert = useCreateAlert()
  const createAlert = (tgId: string) => {
    doCreateAlert({
      sourceGroupId: sourceGroup,
      filterId: filter,
      targetGroupId: tgId,
    })
      .then((resp) => {
        // TODO: find out why we set filter here
        const filter = resp.filter[0]
        console.log(filter)
        setFilter(filter.id ?? '')
      })
      .catch((err) => {
        console.log('Request failed: ' + JSON.stringify(err))
      })
  }

  const doCreateEmailTarget = useCreateEmailTarget()
  const createEmailTarget = async (): Promise<string> => {
    const emailTarget = await doCreateEmailTarget({
      name: email,
      value: email,
    })

    console.log('createEmailTarget: ' + emailTarget.id)
    setStoredEmailId(emailTarget.id ?? '')

    return emailTarget.id!
  }

  const doCreateSmsTarget = useCreateSmsTarget()
  const createSmsTarget = async (): Promise<string> => {
    const smsTarget = await doCreateSmsTarget({
      name: phone,
      value: phone,
    })

    console.log(smsTarget)
    return smsTarget.id!
  }

  const doCreateTelegramTarget = useCreateTelegramTarget()
  const createTelegramTarget = async (): Promise<string> => {
    const telegramTarget = await doCreateTelegramTarget({
      name: telegram,
      value: telegram,
    })

    console.log(telegramTarget)

    const telegramLink =
      'https://t.me/NotifiNetworkBot?start=' + telegramTarget.telegramId!
    setTelegram(telegramLink)
    setStoredTelegram(telegramLink)
    window.open(telegramLink)

    return telegramTarget.id!
  }

  const doUpdateTargetGroup = useUpdateTargetGroup()
  const updateTargetGroup = async function (
    emailId: string,
    smsId: string,
    telegramId: string
  ): Promise<string> {
    const emailTargetIds: string[] = []
    if (emailId !== '') {
      emailTargetIds.push(emailId)
    }

    const smsTargetIds: string[] = []
    if (smsId !== '') {
      smsTargetIds.push(smsId)
    }

    const telegramTargetIds: string[] = []
    if (telegramId !== '') {
      telegramTargetIds.push(telegramId)
    }

    const resp = await doUpdateTargetGroup({
      targetGroupId: targetGroup,
      name: 'husky dao notifications',
      emailTargetIds,
      smsTargetIds,
      telegramTargetIds,
    })

    console.log(resp)
    return resp.id!
  }

  const createTargetGroup = useCreateTargetGroup()
  const createNewTargetGroup = async function (
    emailId: string,
    smsId: string,
    telegramId: string
  ): Promise<string> {
    const emailTargetIds: string[] = []
    if (emailId !== '') {
      emailTargetIds.push(emailId)
    }

    const smsTargetIds: string[] = []
    if (smsId !== '') {
      smsTargetIds.push(smsId)
    }

    const telegramTargetIds: string[] = []
    if (telegramId !== '') {
      telegramTargetIds.push(telegramId)
    }

    const resp = await createTargetGroup({
      name: 'husky dao notifications',
      emailTargetIds,
      smsTargetIds,
      telegramTargetIds,
    })

    console.log(resp)
    return resp.id!
  }

  const handleError = (errors: { message: string }[]) => {
    const message = errors.length > 0 ? errors[0]?.message : 'Unknown error'
    setErrorMessage(message)
    setLoading(false)
  }

  const { jwtRef } = useNotifiJwt()
  const logInFromDao = useLoginFromDao()
  const handleSave = async function () {
    setLoading(true)
    // user is not authenticated
    if (!jwtRef.current && wallet && wallet.publicKey) {
      console.log(wallet)
      console.log(jwtRef.current)
      const ticks = Math.round(Date.now() / 1000)
      const p = await (wallet as any).signMessage(
        new TextEncoder().encode(
          `${wallet?.publicKey}` +
            'HgLym6eZnMZhzXn9tEtfWY18ubDrFb99f81Dke7ZaaNy' +
            ticks.toString()
        ),
        'utf8'
      )

      try {
        const resp = logInFromDao({
          walletPublicKey: wallet.publicKey.toString(),
          tokenAddress: 'HgLym6eZnMZhzXn9tEtfWY18ubDrFb99f81Dke7ZaaNy',
          timestamp: ticks,
          signature: bufferToBase64(p),
        })

        console.log(resp)

        getExistingTargetGroup()
        getFilter()
        getSourceGroup()
      } catch (e) {
        handleError([e])
      }
      setLoading(false)
    }

    if (connected && jwtRef.current) {
      console.log('Sending')
      console.log(email)
      console.log(storedEmail)
      console.log(storedEmailId)
      let emailId = storedEmailId
      let smsId = storedSmsId
      let telegramId = storedTelegramId
      if (email != storedEmail) {
        console.log('creating email')
        emailId = await createEmailTarget()
        setStoredEmailId(emailId)
      }

      if (phone != storedSms) {
        smsId = await createSmsTarget()
        setStoredSmsId(smsId)
      }

      if (telegram != storedTelegram) {
        telegramId = await createTelegramTarget()
        setStoredTelegramId(telegramId)
      }

      if (targetGroup) {
        // Update
        console.log('updating target group')
        await updateTargetGroup(emailId, smsId, telegramId)
      } else {
        // New
        console.log('creating new target group')
        const tgId = await createNewTargetGroup(emailId, smsId, telegramId)
        setTargetGroup(tgId)
        console.log('creating new alert')
        await createAlert(tgId)
      }
    }
    setLoading(false)
  }

  const hasLoaded = mint || councilMint

  const handleEmail = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
    setUnsavedChanges(true)
  }

  const handlePhone = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(e.target.value)
    setUnsavedChanges(true)
  }

  const handleTelegram = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTelegram(e.target.value)
    setUnsavedChanges(true)
  }

  useEffect(() => {
    if (connected && jwtRef.current != null) {
      getExistingTargetGroup()
      getFilter()
      getSourceGroup()
    }
  }, [jwtRef, connected])

  return (
    <div className="bg-bkg-2 p-4 md:p-6 rounded-lg">
      <h3 className="mb-4">Notifications</h3>
      {hasLoaded ? (
        !connected ? (
          <>
            <div className="text-sm text-th-fgd-1">
              Connect wallet to see options
            </div>
          </>
        ) : (
          <>
            <div>
              <div className="text-sm text-th-fgd-1 flex flex-row items-center justify-between mt-4">
                Notifi me on DAO Proposal Changes
              </div>
              {errorMessage.length > 0 ? (
                <div className="text-sm text-red">{errorMessage}</div>
              ) : (
                !jwtRef.current && (
                  <div className="text-sm text-fgd-3">
                    When prompted, sign the transaction.
                  </div>
                )
              )}
            </div>
            <InputRow
              label="E-mail"
              icon={<MailIcon className="mr-1.5 h-4 text-primary-light w-4" />}
            >
              <Input
                className="my-4"
                type="email"
                value={email}
                onChange={handleEmail}
                placeholder="you@email.com"
              />
            </InputRow>

            <InputRow
              label="SMS"
              icon={
                <ChatAltIcon className="mr-1.5 h-4 text-primary-light w-4" />
              }
            >
              <Input
                type="tel"
                value={phone}
                onChange={handlePhone}
                placeholder="+1 XXX-XXXX"
              />
            </InputRow>

            {enableTelegramInput && (
              <InputRow
                label="Telegram"
                icon={
                  <PaperAirplaneIcon
                    className="mr-1.5 h-4 text-primary-light w-4"
                    style={{ transform: 'rotate(45deg)' }}
                  />
                }
              >
                <Input
                  type="text"
                  value={telegram}
                  onChange={handleTelegram}
                  placeholder="Telegram ID"
                />
              </InputRow>
            )}

            <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0 mt-4 justify-end">
              {hasUnsavedChanges && (
                <Button
                  tooltipMessage="Save settings for notifications"
                  className="sm:w-1/2"
                  disabled={!hasUnsavedChanges}
                  onClick={handleSave}
                  isLoading={isLoading}
                >
                  Save
                </Button>
              )}
            </div>
          </>
        )
      ) : (
        <>
          <div className="animate-pulse bg-bkg-3 h-12 mb-4 rounded-lg" />
          <div className="animate-pulse bg-bkg-3 h-10 rounded-lg" />
        </>
      )}
    </div>
  )
}

interface InputRowProps {
  label: string
  icon: React.ReactNode
}

const InputRow: FunctionComponent<InputRowProps> = ({
  children,
  icon,
  label,
}) => {
  return (
    <div className="flex justify-between items-center content-center mt-4">
      <div className="mr-2 py-1 text-sm w-40 h-8 flex items-center">
        {icon}
        {label}
      </div>
      {children}
    </div>
  )
}

const TokenDeposit = ({
  mint,
  tokenType,
  councilVote,
}: {
  mint: MintInfo | undefined
  tokenType: GoverningTokenType
  councilVote?: boolean
}) => {
  const wallet = useWalletStore((s) => s.current)
  const connected = useWalletStore((s) => s.connected)
  const connection = useWalletStore((s) => s.connection.current)
  const { fetchWalletTokenAccounts, fetchRealm } = useWalletStore(
    (s) => s.actions
  )
  const {
    realm,
    realmInfo,
    realmTokenAccount,
    ownTokenRecord,
    ownCouncilTokenRecord,
    councilTokenAccount,
    proposals,
    governances,
    toManyCommunityOutstandingProposalsForUser,
    toManyCouncilOutstandingProposalsForUse,
  } = useRealm()
  // Do not show deposits for mints with zero supply because nobody can deposit anyway
  if (!mint || mint.supply.isZero()) {
    return null
  }

  const depositTokenRecord =
    tokenType === GoverningTokenType.Community
      ? ownTokenRecord
      : ownCouncilTokenRecord

  const depositTokenAccount =
    tokenType === GoverningTokenType.Community
      ? realmTokenAccount
      : councilTokenAccount

  const depositMint =
    tokenType === GoverningTokenType.Community
      ? realm?.account.communityMint
      : realm?.account.config.councilMint

  const tokenName = getMintMetadata(depositMint)?.name ?? realm?.account.name

  const depositTokenName = `${tokenName} ${
    tokenType === GoverningTokenType.Community ? '' : 'Council'
  }`

  const depositTokens = async function (amount: BN) {
    const instructions: TransactionInstruction[] = []
    const signers: Keypair[] = []

    const transferAuthority = approveTokenTransfer(
      instructions,
      [],
      depositTokenAccount!.publicKey,
      wallet!.publicKey!,
      amount
    )

    signers.push(transferAuthority)

    await withDepositGoverningTokens(
      instructions,
      realmInfo!.programId,
      getProgramVersionForRealm(realmInfo!),
      realm!.pubkey,
      depositTokenAccount!.publicKey,
      depositTokenAccount!.account.mint,
      wallet!.publicKey!,
      transferAuthority.publicKey,
      wallet!.publicKey!,
      amount
    )

    const transaction = new Transaction()
    transaction.add(...instructions)

    await sendTransaction({
      connection,
      wallet,
      transaction,
      signers,
      sendingMessage: 'Depositing tokens',
      successMessage: 'Tokens have been deposited',
    })

    await fetchWalletTokenAccounts()
    await fetchRealm(realmInfo!.programId, realmInfo!.realmId)
  }

  const depositAllTokens = async () =>
    await depositTokens(depositTokenAccount!.account.amount)

  const withdrawAllTokens = async function () {
    const instructions: TransactionInstruction[] = []

    // If there are unrelinquished votes for the voter then let's release them in the same instruction as convenience
    if (depositTokenRecord!.account!.unrelinquishedVotesCount > 0) {
      const voteRecords = await getUnrelinquishedVoteRecords(
        connection,
        realmInfo!.programId,
        depositTokenRecord!.account!.governingTokenOwner
      )

      console.log('Vote Records', voteRecords)

      for (const voteRecord of Object.values(voteRecords)) {
        let proposal = proposals[voteRecord.account.proposal.toBase58()]
        if (!proposal) {
          continue
        }

        if (proposal.account.state === ProposalState.Voting) {
          // If the Proposal is in Voting state refetch it to make sure we have the latest state to avoid false positives
          proposal = await getProposal(connection, proposal.pubkey)
          if (proposal.account.state === ProposalState.Voting) {
            const governance =
              governances[proposal.account.governance.toBase58()]
            if (proposal.account.getTimeToVoteEnd(governance.account) > 0) {
              // Note: It's technically possible to withdraw the vote here but I think it would be confusing and people would end up unconsciously withdrawing their votes
              throw new Error(
                `Can't withdraw tokens while Proposal ${proposal.account.name} is being voted on. Please withdraw your vote first`
              )
            } else {
              // finalize proposal before withdrawing tokens so we don't stop the vote from succeeding
              await withFinalizeVote(
                instructions,
                realmInfo!.programId,
                realm!.pubkey,
                proposal.account.governance,
                proposal.pubkey,
                proposal.account.tokenOwnerRecord,
                proposal.account.governingTokenMint
              )
            }
          }
        }

        // Note: We might hit single transaction limits here (accounts and size) if user has too many unrelinquished votes
        // It's not going to be an issue for now due to the limited number of proposals so I'm leaving it for now
        // As a temp. work around I'm leaving the 'Release Tokens' button on finalized Proposal to make it possible to release the tokens from one Proposal at a time
        withRelinquishVote(
          instructions,
          realmInfo!.programId,
          proposal.account.governance,
          proposal.pubkey,
          depositTokenRecord!.pubkey,
          proposal.account.governingTokenMint,
          voteRecord.pubkey,
          depositTokenRecord!.account.governingTokenOwner,
          wallet!.publicKey!
        )
      }
    }

    await withWithdrawGoverningTokens(
      instructions,
      realmInfo!.programId,
      realm!.pubkey,
      depositTokenAccount!.publicKey,
      depositTokenRecord!.account.governingTokenMint,
      wallet!.publicKey!
    )

    try {
      // use chunks of 8 here since we added finalize,
      // because previously 9 withdraws used to fit into one tx
      const ixChunks = chunks(instructions, 8)
      for (const [index, chunk] of ixChunks.entries()) {
        const transaction = new Transaction().add(...chunk)
        await sendTransaction({
          connection,
          wallet,
          transaction,
          sendingMessage:
            index == ixChunks.length - 1
              ? 'Withdrawing tokens'
              : `Releasing tokens (${index}/${ixChunks.length - 2})`,
          successMessage:
            index == ixChunks.length - 1
              ? 'Tokens have been withdrawn'
              : `Released tokens (${index}/${ixChunks.length - 2})`,
        })
      }
      await fetchWalletTokenAccounts()
      await fetchRealm(realmInfo!.programId, realmInfo!.realmId)
    } catch (ex) {
      console.error("Can't withdraw tokens", ex)
    }
  }

  const hasTokensInWallet =
    depositTokenAccount && depositTokenAccount.account.amount.gt(new BN(0))

  const hasTokensDeposited =
    depositTokenRecord &&
    depositTokenRecord.account.governingTokenDepositAmount.gt(new BN(0))

  const depositTooltipContent = !connected
    ? 'Connect your wallet to deposit'
    : !hasTokensInWallet
    ? "You don't have any governance tokens in your wallet to deposit."
    : ''

  const withdrawTooltipContent = !connected
    ? 'Connect your wallet to withdraw'
    : !hasTokensDeposited
    ? "You don't have any tokens deposited to withdraw."
    : !councilVote &&
      (toManyCouncilOutstandingProposalsForUse ||
        toManyCommunityOutstandingProposalsForUser)
    ? "You don't have any governance tokens to withdraw."
    : ''

  const availableTokens =
    depositTokenRecord && mint
      ? fmtMintAmount(
          mint,
          depositTokenRecord.account.governingTokenDepositAmount
        )
      : '0'

  const canShowAvailableTokensMessage =
    !hasTokensDeposited && hasTokensInWallet && connected
  const canExecuteAction = !hasTokensDeposited ? 'deposit' : 'withdraw'
  const canDepositToken = !hasTokensDeposited && hasTokensInWallet
  const tokensToShow =
    canDepositToken && depositTokenAccount
      ? fmtMintAmount(mint, depositTokenAccount.account.amount)
      : canDepositToken
      ? availableTokens
      : 0

  return (
    <>
      <div className="flex space-x-4 items-center mt-8">
        <div className="bg-bkg-1 px-4 py-2 rounded-md w-full">
          <p className="text-fgd-3 text-xs">{depositTokenName} Votes</p>
          <h3 className="mb-0">{availableTokens}</h3>
        </div>
      </div>

      <p
        className={`mt-2 opacity-70 mb-4 ml-1 text-xs ${
          canShowAvailableTokensMessage ? 'block' : 'hidden'
        }`}
      >
        You have {tokensToShow} tokens available to {canExecuteAction}.
      </p>

      <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0 mt-4">
        <Button
          tooltipMessage={depositTooltipContent}
          className="sm:w-1/2"
          disabled={!connected || !hasTokensInWallet}
          onClick={depositAllTokens}
        >
          Deposit
        </Button>

        <Button
          tooltipMessage={withdrawTooltipContent}
          className="sm:w-1/2"
          disabled={
            !connected ||
            !hasTokensDeposited ||
            (!councilVote && toManyCommunityOutstandingProposalsForUser) ||
            toManyCouncilOutstandingProposalsForUse
          }
          onClick={withdrawAllTokens}
        >
          Withdraw
        </Button>
      </div>
    </>
  )
}

export default NotificationsCard
