import DirectoryPage from '../directory/page';
import SignInModal from './SignInModal';

export default function SignInPage() {
  return <>
    <DirectoryPage searchParams={Promise.resolve({})} />
    <SignInModal />
  </>;
}
