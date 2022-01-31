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
import { StyledLabel } from './inputs/styles'
import Switch from './Switch'
import React, { FunctionComponent, useState } from 'react'
import {
  ChatAltIcon,
  MailIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/solid'
import { string } from 'superstruct'
import axios from 'axios'
import useLocalStorageState, {
  useLocalStorageStringState,
} from '@hooks/useLocalStorageState'

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
  const [checked, setChecked] = useState<boolean>(false)
  const [hasUnsavedChanges, setUnsavedChanges] = useState<boolean>(false)
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
  const [jwt, setJwt] = useLocalStorageStringState('notifi-jwt', null)

  const getExistingTargetGroup = () => {
    const config = {
      headers: { Authorization: `Bearer ${jwt}` },
    }

    axios
      .post(
        'https://api.notifi.network/api/gql',
        {
          query: `query targetGroup {
              targetGroup() {
                id
                name
                emailTargets {
                  id
                  name
                  emailAddress
                }
                smsTargets {
                  id
                  name
                  phoneNumber
                }
                telegramTargets {
                  id
                  name
                  telegramId
                }
              }
            }`,
        },
        config
      )
      .then((resp) => {
        console.log(resp.data.data.targetGroup[0])
        if (resp.data.data.targetGroup[0] != null) {
          setTargetGroup(resp.data.data.targetGroup[0].id)
          if (resp.data.data.targetGroup[0].emailTargets.length > 0) {
            setEmail(resp.data.data.targetGroup[0].emailTargets[0].emailAddress)
            setStoredEmail(
              resp.data.data.targetGroup[0].emailTargets[0].emailAddress
            )
            setStoredEmailId(resp.data.data.targetGroup[0].emailTargets[0].id)
          }
          if (resp.data.data.targetGroup[0].smsTargets.length > 0) {
            setPhone(resp.data.data.targetGroup[0].smsTargets[0].phoneNumber)
            setStoredSms(
              resp.data.data.targetGroup[0].smsTargets[0].phoneNumber
            )
            setStoredSmsId(resp.data.data.targetGroup[0].smsTargets[0].id)
          }
          if (resp.data.data.targetGroup[0].telegramTargets.length > 0) {
            setTelegram(
              resp.data.data.targetGroup[0].telegramTargets[0].telegramId
            )
            setStoredTelegram(
              resp.data.data.targetGroup[0].telegramTargets[0].telegramId
            )
            setStoredTelegramId(
              resp.data.data.targetGroup[0].telegramTargets[0].id
            )
          }
        }
      })
      .catch((err) => {
        console.log('Request failed: ' + JSON.stringify(err))
      })
  }
  const getSourceGroup = () => {
    const config = {
      headers: { Authorization: `Bearer ${jwt}` },
    }
    axios
      .post(
        'https://api.notifi.network/api/gql',
        {
          query: `query sourceGroup {
              sourceGroup() {
                id
                name
              }
            }`,
        },
        config
      )
      .then((resp) => {
        console.log(resp.data.data.sourceGroup[0])
        setSourceGroup(resp.data.data.sourceGroup[0].id)
      })
      .catch((err) => {
        console.log('Request failed: ' + JSON.stringify(err))
      })
  }
  const getFilter = () => {
    const config = {
      headers: { Authorization: `Bearer ${jwt}` },
    }
    axios
      .post(
        'https://api.notifi.network/api/gql',
        {
          query: `query filter {
              filter() {
                id
                name
              }
            }`,
        },
        config
      )
      .then((resp) => {
        console.log(resp.data.data.filter[0])
        setFilter(resp.data.data.filter[0].id)
      })
      .catch((err) => {
        console.log('Request failed: ' + JSON.stringify(err))
      })
  }

  const createAlert = (tgId: string) => {
    const config = {
      headers: { Authorization: `Bearer ${jwt}` },
    }
    axios
      .post(
        'https://api.notifi.network/api/gql',
        {
          query: `mutation createAlert {
              createAlert(alertInput: {
                sourceGroupId: "${sourceGroup}",
                filterId: "${filter}",
                targetGroupId: "${tgId}",
              }) {
                id
                name
              }
            }`,
        },
        config
      )
      .then((resp) => {
        console.log(resp.data.data.filter[0])
        setFilter(resp.data.data.filter[0].id)
      })
      .catch((err) => {
        console.log('Request failed: ' + JSON.stringify(err))
      })
  }

  const createEmailTarget = async function (): Promise<string> {
    const config = {
      headers: { Authorization: `Bearer ${jwt}` },
    }
    return new Promise<string>((resolve, reject) => {
      axios
        .post(
          'https://api.notifi.network/api/gql',
          {
            query: `mutation createEmailTarget {
          createEmailTarget(createTargetInput: {
            name: "${email}",
            value: "${email}"
          }) {
            id
            name
          }
        }`,
          },
          config
        )
        .then((resp) => {
          console.log(
            'createEmailTarget: ' + resp.data.data.createEmailTarget.id
          )
          setStoredEmailId(resp.data.data.createEmailTarget.id)
          resolve(resp.data.data.createEmailTarget.id)
        })
        .catch((err) => {
          console.log('Request failed: ' + JSON.stringify(err))
          reject(err)
        })
    })
  }

  const createSmsTarget = async function (): Promise<string> {
    const config = {
      headers: { Authorization: `Bearer ${jwt}` },
    }
    return new Promise<string>((resolve, reject) => {
      axios
        .post(
          'https://api.notifi.network/api/gql',
          {
            query: `mutation createSmsTarget {
              createSmsTarget(createTargetInput: {
                name: "${phone}",
                value: "${phone}"
              }) {
                id
                name
              }
            }`,
          },
          config
        )
        .then((resp) => {
          console.log(resp.data.data.createSmsTarget)
          resolve(resp.data.data.createSmsTarget.id)
        })
        .catch((err) => {
          console.log('Request failed: ' + JSON.stringify(err))
          reject(err)
        })
    })
  }

  const createTelegramTarget = async function (): Promise<string> {
    const config = {
      headers: { Authorization: `Bearer ${jwt}` },
    }
    return new Promise<string>((resolve, reject) => {
      axios
        .post(
          'https://api.notifi.network/api/gql',
          {
            query: `mutation createTelegramTarget {
              createTelegramTarget(createTargetInput: {
                name: "${telegram}",
                value: "${telegram}"
              }) {
                id
                name
              }
            }`,
          },
          config
        )
        .then((resp) => {
          console.log(resp.data.data.createTelegramTarget)
          resolve(resp.data.data.createTelegramTarget.id)
        })
        .catch((err) => {
          console.log('Request failed: ' + JSON.stringify(err))
          reject(err)
        })
    })
  }

  const updateTargetGroup = async function (
    emailId: string,
    smsId: string,
    telegramId: string
  ): Promise<string> {
    const config = {
      headers: { Authorization: `Bearer ${jwt}` },
    }
    return new Promise<string>((resolve, reject) => {
      axios
        .post(
          'https://api.notifi.network/api/gql',
          {
            query: `mutation createTargetGroup {
              createTargetGroup(targetGroupInput: {
                id: "${targetGroup}"
                emailTargetIds: ["${emailId}"],
                name: "husky dao notifications"
              }) {
                id
                name
              }
            }`,
          },
          config
        )
        .then((resp) => {
          console.log(resp.data.data.createTargetGroup)
          resolve(resp.data.data.createTargetGroup.id)
        })
        .catch((err) => {
          console.log('Request failed: ' + JSON.stringify(err))
          reject(err)
        })
    })
  }

  const createNewTargetGroup = async function (
    emailId: string,
    smsId: string,
    telegramId: string
  ): Promise<string> {
    const config = {
      headers: { Authorization: `Bearer ${jwt}` },
    }
    console.log(storedEmailId)
    return new Promise<string>((resolve, reject) => {
      console.log('emailId: ' + emailId)
      axios
        .post(
          'https://api.notifi.network/api/gql',
          {
            query: `mutation createTargetGroup {
              createTargetGroup(targetGroupInput: {
                emailTargetIds: ["${emailId}"],
                name: "husky dao notifications"
              }) {
                id
                name
              }
            }`,
          },
          config
        )
        .then((resp) => {
          console.log(resp.data.data.createTargetGroup)
          resolve(resp.data.data.createTargetGroup.id)
        })
        .catch((err) => {
          console.log('Request failed: ' + JSON.stringify(err))
          reject(err)
        })
    })
  }

  const handleClick = async function () {
    if (connected && jwt) {
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

  const handleCheck = (bool: boolean) => {
    setChecked(bool)
    if (!bool) {
      // toggling off is essentially canceling and reverting any unsaved changes
      setUnsavedChanges(false)
      // TODO: reset email/phone/telegram to initial state
    } else {
      if (!jwt) {
        console.log(wallet)
        console.log(jwt)
        const ticks = Math.round(Date.now() / 1000)
        const signature = wallet.signMessage(
          new TextEncoder().encode(
            'DU9mJ28rE8zSoaeqdTpBMEvG27YFE8b4iXq1e17QrWe2' +
              'HgLym6eZnMZhzXn9tEtfWY18ubDrFb99f81Dke7ZaaNy' +
              ticks.toString()
          ),
          'utf8'
        )
        signature
          .then((p) => {
            console.log(p.buffer)
            console.log(bufferToBase64(p))
            axios
              .post('https://api.notifi.network/api/gql', {
                query: `mutation logInFromDao {
              logInFromDao(daoLogInInput: {
                walletPublicKey: "DU9mJ28rE8zSoaeqdTpBMEvG27YFE8b4iXq1e17QrWe2",
                tokenAddress: "HgLym6eZnMZhzXn9tEtfWY18ubDrFb99f81Dke7ZaaNy",
                timestamp: ${ticks}
              }, signature: "${bufferToBase64(p)}") {
                email
                emailConfirmed
                token
              }
            }`,
              })
              .then((resp) => {
                console.log(resp)
                setJwt(resp['data'].data.logInFromDao.token!)
                getExistingTargetGroup()
                getFilter()
                getSourceGroup()
              })
              .catch((err) => {
                console.log('Request failed: ' + JSON.stringify(err))
              })
          })
          .catch((err) => {
            console.log('Failed to sign request. ' + JSON.stringify(err))
          })
      } else {
        console.log(jwt)
        getExistingTargetGroup()
        getFilter()
        getSourceGroup()
      }
    }
  }

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
              <div className="text-sm text-th-fgd-1 flex flex-row items-center justify-between my-4">
                Notifi me on DAO Proposal Changes
                <Switch onChange={handleCheck} checked={checked} />
              </div>
              {jwt == '' && !checked && (
                <div className="text-sm text-fgd-3">
                  When activated, please sign the transaction.
                </div>
              )}
            </div>

            {checked && (
              <>
                <InputRow
                  label="E-mail"
                  icon={
                    <MailIcon className="mr-1.5 h-4 text-primary-light w-4" />
                  }
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

                <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0 mt-8 justify-end">
                  {hasUnsavedChanges && (
                    <Button
                      tooltipMessage="Save settings for notifications"
                      className="sm:w-1/2"
                      disabled={!hasUnsavedChanges}
                      onClick={handleClick}
                    >
                      Save
                    </Button>
                  )}
                </div>
              </>
            )}
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
    <div className="flex justify-between items-center content-center my-4">
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
